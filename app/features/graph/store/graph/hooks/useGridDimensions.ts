import { useCameraLivePosition } from '../../camera/hooks/useCameraLivePosition'
import { useCameraLiveZoom } from '../../camera/hooks/useCameraLiveZoom'

type GridDimensions = {
  size: number
  thickness: number
  position: [number, number]
}

export const useGridDimensions = (): GridDimensions => {
  const [cx, cy] = useCameraLivePosition()
  const zoom = useCameraLiveZoom()

  const scale = zoom < 0.5 ? 5 : 1

  const pxtomm = 0.26458

  return {
    size: 25 * pxtomm * zoom * scale,
    thickness: 0.3 * zoom,
    position: [(cx * pxtomm) % (25 * pxtomm * zoom * scale), (cy * pxtomm) % (25 * pxtomm * zoom * scale)],
  }
}
