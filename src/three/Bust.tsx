import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { buildHeadGeometry, buildBustBaseGeometry, makeFaceMaterial } from '../pieces/bustHead'
import type { Color } from '../game/types'

// Geometries are static and shared across all busts.
const headGeo = buildHeadGeometry()
const baseGeo = buildBustBaseGeometry()

interface BustProps {
  texture: THREE.Texture
  color: Color
  y: number
}

/**
 * A sculpted 3D portrait head mounted above a piece. The photo is projected onto
 * the front of the head; the neck/shoulders and the head's sides/back are the
 * marble/onyx sculpt. It is a real 3D object (not billboarded) so you can orbit
 * around it.
 */
export function Bust({ texture, color, y }: BustProps) {
  const baseColor = color === 'w' ? '#efe7d6' : '#2b2b33'

  const faceMat = useMemo(() => makeFaceMaterial(texture, baseColor), [texture, baseColor])
  const baseMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.5,
        metalness: color === 'w' ? 0.05 : 0.15,
      }),
    [baseColor, color],
  )

  // Dispose materials when they change or the bust unmounts.
  useEffect(() => () => faceMat.dispose(), [faceMat])
  useEffect(() => () => baseMat.dispose(), [baseMat])

  return (
    <group position={[0, y, 0]}>
      <mesh geometry={headGeo} material={faceMat} castShadow />
      <mesh geometry={baseGeo} material={baseMat} position={[0, -0.21, 0]} castShadow />
    </group>
  )
}
