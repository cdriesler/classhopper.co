import React, { useCallback, useState, useLayoutEffect, useEffect, useRef, useContext } from 'react'
import { useGraphDispatch, useGraphElements } from '@/features/graph/store/graph/hooks'
import { useCameraStaticZoom } from '@/features/graph/store/camera/hooks'
import { getConnectedWires } from '../../../utils'
import { NodePen } from '@/glib/dist'

type ResizableStore = {
  transform: [tx: number, ty: number]
  dimensions: {
    width: number
    height: number
  }
  onResizeStart: (e: React.PointerEvent<HTMLDivElement>, anchor: ResizeAnchor) => void
}

export type ResizeAnchor = 'T' | 'TL' | 'L' | 'BL' | 'B' | 'BR' | 'R' | 'TR'

const ResizableContext = React.createContext<ResizableStore>({
  transform: [0, 0],
  dimensions: {
    width: 0,
    height: 0,
  },
  onResizeStart: () => '',
})

type ResizableElementContainerProps = {
  elementId: string
  elementAnchors?: {
    L?: string[]
    R?: string[]
  }
  children?: JSX.Element
}

export const ResizableElementContainer = ({
  elementId,
  elementAnchors,
  children,
}: ResizableElementContainerProps): React.ReactElement => {
  const elements = useGraphElements()
  const { updateElement, batchUpdateLiveElement } = useGraphDispatch()

  const zoom = useCameraStaticZoom()

  const element = elements[elementId]

  const [internalTransform, setInternalTransform] = useState<ResizableStore['transform']>([0, 0])
  const [internalDimensions, setInternalDimensions] = useState<ResizableStore['dimensions']>(element.current.dimensions)

  const MINIMUM_WIDTH = 128
  const MAXIMUM_WIDTH = 500
  const MINIMUM_HEIGHT = 80
  const MAXIMUM_HEIGHT = 500

  useLayoutEffect(() => {
    setInternalTransform([0, 0])
    setInternalDimensions(element.current.dimensions)
  }, [element.current.dimensions])

  const internalAnchor = useRef<ResizeAnchor>('TL')
  const internalAnchorId = useRef<number>()
  const internalDeltaX = useRef(0)
  const internalDeltaY = useRef(0)

  const resizeStartPosition = useRef<[number, number]>([0, 0])
  const resizeWires = useRef<[from: string[], to: string[]]>([[], []])

  const [isResizing, setIsResizing] = useState(false)
  const initialWidth = useRef(0)
  const initialHeight = useRef(0)

  const onResizeStart = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, anchor: ResizeAnchor): void => {
      if (e.pointerType !== 'mouse') {
        return
      }

      e.stopPropagation()

      // Prepare internal state for resize motion
      const { pageX, pageY } = e
      resizeStartPosition.current = [pageX, pageY]

      internalAnchor.current = anchor
      internalAnchorId.current = e.pointerId

      internalDeltaX.current = 0
      internalDeltaY.current = 0

      initialWidth.current = internalDimensions.width
      initialHeight.current = internalDimensions.height

      // Prepare for live motion of attached elements
      resizeWires.current = getConnectedWires(Object.values(elements), elementId)

      setIsResizing(true)
    },
    [elements, elementId, internalDimensions]
  )

  const handlePointerMove = useCallback(
    (e: PointerEvent): void => {
      if (!isResizing) {
        return
      }

      if (e.pointerId !== internalAnchorId.current) {
        return
      }

      const { pageX: x, pageY: y } = e

      const [sx, sy] = resizeStartPosition.current
      const [dx, dy] = [x - sx, y - sy]

      const anchor = internalAnchor.current

      const dxModifier = anchor.includes('R') ? 1 : -1
      const dyModifier = anchor.includes('T') ? -1 : 1

      const widthDelta = dx * dxModifier
      const heightDelta = dy * dyModifier

      internalDeltaX.current = widthDelta / zoom
      internalDeltaY.current = heightDelta / zoom

      const clamp = (value: number, min: number, max: number): number => {
        return value < min ? min : value > max ? max : value
      }

      const clampX = (value: number): number => clamp(value, MINIMUM_WIDTH, MAXIMUM_WIDTH)
      const clampY = (value: number): number => clamp(value, MINIMUM_HEIGHT, MAXIMUM_HEIGHT)

      const [tx, ty] = internalTransform
      const { width, height } = internalDimensions

      const nextWidth = clampX(initialWidth.current + internalDeltaX.current)
      const nextHeight = clampY(initialHeight.current + internalDeltaY.current)

      const nextDx = (nextWidth - width) * dxModifier
      const nextDy = (nextHeight - height) * dyModifier

      if (nextDx === 0 && nextDy === 0) {
        // No change allowed, do no work
        return
      }

      const isVertical = anchor.includes('T') || anchor.includes('B')
      const isHorizontal = anchor.includes('L') || anchor.includes('R')

      setInternalDimensions({
        width: isHorizontal ? nextWidth : width,
        height: isVertical ? nextHeight : height,
      })

      switch (internalAnchor.current) {
        case 'TL': {
          setInternalTransform([tx + nextDx, ty + nextDy])
          break
        }
        case 'T':
        case 'TR': {
          setInternalTransform([0, ty + nextDy])
          break
        }
        case 'L':
        case 'BL': {
          setInternalTransform([tx + nextDx, 0])
          break
        }
        case 'B':
        case 'R':
        case 'BR': {
          break
        }
      }

      // Determine live wire motion
      let fromMotion: [number, number] = [0, 0]
      let toMotion: [number, number] = [0, 0]

      switch (internalAnchor.current) {
        case 'TL':
        case 'BL':
          toMotion = [nextDx, nextDy / 2]
          fromMotion = [0, nextDy / 2]
          break
        case 'L':
          toMotion = [nextDx, 0]
          fromMotion = [0, 0]
          break
        case 'TR':
        case 'BR':
          toMotion = [0, nextDy / 2]
          fromMotion = [nextDx, nextDy / 2]
          break
        case 'R':
          toMotion = [0, 0]
          fromMotion = [nextDx, 0]
          break
        case 'T':
        case 'B':
          toMotion = [0, nextDy / 2]
          fromMotion = [0, nextDy / 2]
      }

      const [fromWireIds, toWireIds] = resizeWires.current

      const operations: Parameters<typeof batchUpdateLiveElement>[0] = []

      for (const id of toWireIds) {
        const wire = elements[id] as NodePen.Element<'wire'>

        const [wx, wy] = wire.current.to
        const [dx, dy] = toMotion

        operations.push({
          id,
          type: 'wire',
          data: {
            to: [wx + dx, wy + dy],
          },
        })
      }

      for (const id of fromWireIds) {
        const wire = elements[id] as NodePen.Element<'wire'>

        const [wx, wy] = wire.current.from
        const [dx, dy] = fromMotion

        operations.push({
          id,
          type: 'wire',
          data: {
            from: [wx + dx, wy + dy],
          },
        })
      }

      batchUpdateLiveElement(operations)
    },
    [elements, zoom, isResizing, internalTransform, internalDimensions, batchUpdateLiveElement]
  )

  const handlePointerUp = useCallback(() => {
    setIsResizing(false)

    const { width: initialWidth, height: initialHeight } = element.current.dimensions
    const { width: finalWidth, height: finalHeight } = internalDimensions
    const [widthDelta, heightDelta] = [finalWidth - initialWidth, finalHeight - initialHeight]

    const [x, y] = element.current.position
    const [tx, ty] = internalTransform

    // Calculate total anchor changes
    let leftMotion: [number, number] = [0, 0]
    let rightMotion: [number, number] = [0, 0]

    switch (internalAnchor.current) {
      case 'L':
      case 'TL':
      case 'BL':
        leftMotion = [0, heightDelta / 2]
        rightMotion = [widthDelta, heightDelta / 2]
        break
      case 'R':
      case 'TR':
      case 'BR':
        leftMotion = [0, heightDelta / 2]
        rightMotion = [widthDelta, heightDelta / 2]
        break
      case 'T':
      case 'B':
        leftMotion = [0, heightDelta / 2]
        rightMotion = [0, heightDelta / 2]
        break
    }

    const currentAnchors = 'anchors' in element.current ? { ...element.current.anchors } : {}

    for (const anchorId of elementAnchors?.L ?? []) {
      if (!currentAnchors[anchorId]) {
        continue
      }

      const [ax, ay] = currentAnchors[anchorId]
      const [dx, dy] = leftMotion

      console.log({ ax, ay })
      console.log({ dx, dy })

      currentAnchors[anchorId] = [ax + dx, ay + dy]
    }

    for (const anchorId of elementAnchors?.R ?? []) {
      if (!currentAnchors[anchorId]) {
        continue
      }

      const [ax, ay] = currentAnchors[anchorId]
      const [dx, dy] = rightMotion

      currentAnchors[anchorId] = [ax + dx, ay + dy]
    }

    updateElement({
      id: elementId,
      type: element.template.type,
      data: {
        position: [x + tx, y + ty],
        dimensions: internalDimensions,
        anchors: { ...currentAnchors },
      },
    })

    resizeWires.current = [[], []]
  }, [element, elementId, elementAnchors, updateElement, internalTransform, internalDimensions])

  useEffect(() => {
    if (!isResizing) {
      return
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  })

  useEffect(() => {
    const getCursor = (): string => {
      switch (internalAnchor.current) {
        case 'T':
        case 'B':
          return 'ns-resize'
        case 'L':
        case 'R':
          return 'ew-resize'
        case 'TL':
        case 'BR':
          return 'nwse-resize'
        case 'TR':
        case 'BL':
          return 'nesw-resize'
      }
    }

    document.documentElement.style['cursor'] = isResizing ? getCursor() : 'auto'
  }, [isResizing])

  const store: ResizableStore = {
    transform: internalTransform,
    dimensions: internalDimensions,
    onResizeStart,
  }

  return <ResizableContext.Provider value={store}>{children}</ResizableContext.Provider>
}

export const useResizableElement = (): ResizableStore => {
  return useContext(ResizableContext)
}
