import React, { useRef, useEffect, useCallback } from 'react'
import { AssetType, Viewer, ViewerEvent } from '@speckle/viewer'
import ObjectLoader from '@speckle/objectloader'
import { Layer } from '../common'
import { useViewRegistry } from '../common/hooks'
import { useDispatch } from '@/store'

type SpeckleModelViewProps = {
  stream: {
    id: string
    url: string
    token: string
  }
  rootObjectId?: string
}

const SpeckleModelView = ({ stream, rootObjectId }: SpeckleModelViewProps): React.ReactElement | null => {
  const { viewPosition } = useViewRegistry({ key: 'speckle-viewer', label: 'Model' })

  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Viewer>()

  const { apply } = useDispatch()

  const setModelLoadStatus = useCallback((progress: number) => {
    apply((state) => {
      state.lifecycle.model.progress = progress
    })
  }, [])

  const safeSetModelLoadStatus = useThrottleCallback(setModelLoadStatus, 200)

  useEffect(() => {
    if (!containerRef.current) {
      console.log(`🐍 Failed to mount Speckle Viewer container div!`)
      return
    }

    if (viewerRef.current) {
      return
    }

    const viewer = new Viewer(containerRef.current, {
      showStats: false,
      verbose: false,
      environmentSrc: {
        id: '',
        src: '',
        type: AssetType.TEXTURE_HDR,
      },
    })

    viewerRef.current = viewer

    void viewer.init().then(() => {
      viewerRef.current = viewer
    })

    // viewer.on(ViewerEvent.LoadProgress, (arg) => {
    //   const { progress } = arg
    //   safeSetModelLoadStatus(progress)
    // })

    return () => {
      viewer.dispose()
    }
  }, [])

  const refreshObjects = useCallback(async () => {
    const viewer = viewerRef.current

    if (!viewer || !rootObjectId) {
      return
    }

    await viewer.unloadAll()

    apply((state) => {
      state.lifecycle.model.status = 'loading'
    })

    const loader = new ObjectLoader({
      serverUrl: stream.url,
      streamId: stream.id,
      objectId: rootObjectId,
    })

    await viewer.loadObject(loader, stream.token)

    let visibleObjectCount = 0

    viewer.getWorldTree().walk((node) => {
      const isVisible = !!node.model.renderView
      if (isVisible) {
        visibleObjectCount++
      }
      return true
    })

    apply((state) => {
      state.lifecycle.model = { status: 'ready', progress: 1, objectCount: visibleObjectCount }
    })
  }, [rootObjectId])

  const requestRefreshObjects = useDeferCallback(refreshObjects)

  useEffect(() => {
    requestRefreshObjects()
  }, [rootObjectId])

  return (
    <Layer id="np-model-layer" position={viewPosition ?? 1} z={10}>
      <div className="np-w-full np-h-full np-pointer-events-auto np-bg-pale" ref={containerRef} />
    </Layer>
  )
}

// Delay serial requests to invoke a given callback until the current invocation finishes.
// Multiple requests while waiting will only lead to one invocation.
const useDeferCallback = (callback: () => Promise<void>): (() => void) => {
  const isInvoked = useRef(false)
  const shouldInvoke = useRef(false)

  const requestInvoke = useCallback(() => {
    const handleInvoke = () => {
      isInvoked.current = true
      shouldInvoke.current = false

      callback().finally(() => {
        isInvoked.current = false
        if (shouldInvoke.current) {
          handleInvoke()
        }
      })
    }

    if (!isInvoked.current) {
      // We are not awaiting a call, call immediately
      handleInvoke()
    } else {
      // We are awaiting a call, flag request for a subsequent run.
      shouldInvoke.current = true
    }
  }, [callback])

  return requestInvoke
}

const useThrottleCallback = <T extends unknown[]>(
  callback: (...args: T) => void,
  intervalMs: number
): ((...args: T) => void) => {
  const internalCallback = useRef(callback)

  useEffect(() => {
    internalCallback.current = callback
  }, [callback])

  const nextArgs = useRef<T>()
  const interval = useRef<ReturnType<typeof setInterval>>()

  const handleInvoke = useCallback(() => {
    if (!nextArgs.current) {
      return
    }

    internalCallback.current(...nextArgs.current)

    interval.current = setInterval(() => {
      if (!nextArgs.current) {
        clearInterval(interval.current)
        return
      }

      const invokeArgs = nextArgs.current
      nextArgs.current = undefined
      internalCallback.current(...invokeArgs)
    }, intervalMs)
  }, [callback])

  const throttleCallback = useCallback(
    (...args: T): void => {
      if (!nextArgs.current) {
        nextArgs.current = args
        handleInvoke()
      } else {
        nextArgs.current = args
      }
    },
    [handleInvoke]
  )

  return throttleCallback
}

export default React.memo(SpeckleModelView)
