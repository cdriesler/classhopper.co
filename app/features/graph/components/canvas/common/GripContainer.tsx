import React, { useCallback, useRef, useState } from 'react'
import { NodePen } from 'glib'
import { GripContext } from './GripContext'
import { useGraphDispatch } from '@/features/graph/store/graph/hooks'
import { useScreenSpaceToCameraSpace } from '@/features/graph/hooks'
import { useAppStore } from '@/features/common/store'
import { getWireMode } from '@/features/graph/store/hotkey/utils'
import { getConnectedWires, getLiveWires } from '@/features/graph/store/graph/utils'
import { PointerTooltip } from '../../overlay'
import { GripTooltip } from './GripTooltip'
import { getInitialWireMode } from '@/features/graph/store/hotkey/utils/getInitialWireMode'
import { WireMode } from '@/features/graph/store/graph/types'

type GripContainerProps = {
  elementId: string
  parameterId: string
  mode: 'input' | 'output'
  children: JSX.Element
}

/**
 * The generic grip container wraps its child and attaches all wire creation events and logic.
 */
const GripContainer = ({ elementId, parameterId, mode, children }: GripContainerProps): React.ReactElement => {
  const store = useAppStore()
  const { registerElementAnchor, captureLiveWires, startLiveWires, releaseLiveWires, endLiveWires } = useGraphDispatch()

  const screenSpaceToCameraSpace = useScreenSpaceToCameraSpace()

  const gripRef = useRef<HTMLDivElement>(null)

  const handleRegister = useCallback(
    (offset: [ox: number, oy: number]) => {
      if (!gripRef.current) {
        console.log(`🐍 Attempted to register grip before its ref existed!`)
        return
      }

      const parentElement = store.getState().graph.present.elements[elementId]

      if (!parentElement) {
        console.log(`🐍 Attempted to register a grip as an anchor for an element that doesn't exist!`)
        return
      }

      const { width, height, left, top } = gripRef.current.getBoundingClientRect()

      const [sx, sy] = [left + width / 2, top + height / 2]

      const [x, y] = screenSpaceToCameraSpace([sx, sy])

      const [ex, ey] = parentElement.current.position
      const [dx, dy] = [x - ex, y - ey]

      // Allow children to adjust expected result
      const [offsetX, offsetY] = offset

      registerElementAnchor({ elementId, anchorId: parameterId, position: [dx + offsetX, dy + offsetY] })
    },
    [store, elementId, parameterId, gripRef, registerElementAnchor, screenSpaceToCameraSpace]
  )

  // const localPointerActive = useRef(false)
  const localPointerId = useRef<number>()
  const localPointerStartTime = useRef(Date.now())
  const localPointerStartPosition = useRef<[number, number]>([0, 0])

  const [showWireTooltip, setShowWireTooltip] = useState(false)
  const wireTooltipPosition = useRef<[number, number]>([0, 0])

  const handlePointerEnter = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (e.pointerId === localPointerId.current) {
      // Prevent self-collision
      return
    }

    switch (e.pointerType) {
      case 'mouse': {
        const { pageX, pageY } = e

        const liveWires = getLiveWires(store.getState().graph.present)

        if (liveWires.length === 0) {
          wireTooltipPosition.current = [pageX, pageY]
          setShowWireTooltip(true)
          return
        }
      }
    }

    captureLiveWires({ type: mode, elementId, parameterId })
  }

  const handlePointerLeave = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (e.pointerId === localPointerId.current) {
      // Prevent self-collision
      return
    }

    switch (e.pointerType) {
      case 'mouse': {
        if (showWireTooltip) {
          setShowWireTooltip(false)
        }
      }
    }

    releaseLiveWires()
  }

  // const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>): void => {
  //   if (localPointerActive.current) {
  //     return
  //   }

  //   switch (e.pointerType) {
  //     case 'mouse': {
  //       const { pageX, pageY } = e
  //       setWireTooltipPosition([pageX, pageY])
  //     }
  //   }
  // }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    e.stopPropagation()

    const { pointerId, pageX: ex, pageY: ey } = e

    const getInitialMode = (
      graph: ReturnType<typeof store['getState']>['graph']['present'],
      hotkey: ReturnType<typeof store['getState']>['hotkey']
    ): WireMode | 'transpose' => {
      const initialMode = getInitialWireMode(hotkey)

      switch (initialMode) {
        case 'transpose': {
          const [fromWires, toWires] = getConnectedWires(graph, elementId, parameterId)
          const transposeIsValid = [...fromWires, ...toWires].length > 0

          return transposeIsValid ? 'transpose' : 'default'
        }
        default: {
          return initialMode
        }
      }
    }

    switch (e.pointerType) {
      case 'mouse': {
        const initialMode = getInitialMode(store.getState().graph.present, store.getState().hotkey)

        const map = {
          from:
            mode === 'output'
              ? {
                  elementId,
                  parameterId,
                }
              : undefined,
          to:
            mode === 'output'
              ? undefined
              : {
                  elementId,
                  parameterId,
                },
        } as any

        switch (initialMode) {
          case 'transpose': {
            // TODO
            const state = store.getState().graph.present
            const [existingFromWires, existingToWires] = getConnectedWires(state, elementId, parameterId)
            const existingWires = [...existingFromWires, ...existingToWires].map(
              (wireId) => state.elements[wireId] as NodePen.Element<'wire'>
            )
            if (existingWires.length > 0) {
              const liveTemplates = existingWires.map((wire) => {
                const ends: any =
                  mode === 'input'
                    ? { from: wire.template.from, to: undefined }
                    : { from: undefined, to: wire.template.to }
                const template: NodePen.Element<'wire'>['template'] = {
                  type: 'wire',
                  mode: 'live',
                  initial: {
                    pointer: e.pointerId,
                    mode: 'default',
                  },
                  transpose: true,
                  ...ends,
                }
                return template
              })
              startLiveWires({
                templates: liveTemplates,
                origin: {
                  elementId,
                  parameterId,
                },
              })
              break
            }
            // Transpose not possible, fall through to default
          }
          /* eslint-disable-next-line */
          default: {
            startLiveWires({
              templates: [
                {
                  type: 'wire',
                  mode: 'live',
                  initial: {
                    pointer: e.pointerId,
                    mode: initialMode === 'transpose' ? 'default' : initialMode,
                  },
                  transpose: false,
                  ...map,
                },
              ],
              origin: {
                elementId,
                parameterId,
              },
            })
          }
        }
        break
      }
      case 'pen':
      case 'touch': {
        localPointerId.current = pointerId
        localPointerStartTime.current = Date.now()
        localPointerStartPosition.current = [ex, ey]
      }
    }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>): void => {
    e.stopPropagation()

    endLiveWires(getWireMode(store.getState().hotkey))

    localPointerId.current = undefined
  }

  return (
    <GripContext gripRef={gripRef} register={handleRegister}>
      <>
        <div
          className="w-full h-full"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          role="presentation"
          onMouseDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
        {showWireTooltip ? (
          <PointerTooltip
            initialPosition={wireTooltipPosition.current}
            offset={[25, 25]}
            pointerFilter={[]}
            pointerTypeFilter={['mouse']}
          >
            <GripTooltip source={{ elementId, parameterId }} />
          </PointerTooltip>
        ) : null}
      </>
    </GripContext>
  )
}

export default React.memo(GripContainer)