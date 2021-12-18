import { NodePen } from 'glib'
import { Mesh, SphereGeometry } from 'three'
import { Remapper } from '../types'
import { defaultMaterial } from '../materials'

export const convertPointToMesh = (
  geometry: NodePen.SolutionValue['point'],
  remap?: Remapper
): Mesh => {
  const { x, y, z } = geometry

  const px = remap?.x(x) ?? x
  const py = remap?.y(y) ?? y
  const pz = remap?.z(z) ?? z

  console.log(`${px},${py},${pz}`)

  const pointGeometry = new SphereGeometry(0.05, 100, 100)
  const point = new Mesh(pointGeometry, defaultMaterial)

  point.position.set(px, py, pz)
  point.castShadow = true

  return point
}
