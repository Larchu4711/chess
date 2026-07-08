import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import type { BoardPiece } from '../game/types'
import { getPieceParts, PIECE_HEIGHT } from './pieceGeometry'
import { squareToWorld } from './coords'
import { createPortraitTexture } from '../pieces/portraitTexture'
import { useGameStore } from '../store/gameStore'
import { skinKey } from '../game/types'

interface PieceProps {
  piece: BoardPiece
  selected: boolean
}

/** Material presets for the two piece sets: pale marble vs dark onyx. */
function useMaterial(color: 'w' | 'b') {
  return useMemo(() => {
    if (color === 'w') {
      return new THREE.MeshStandardMaterial({
        color: '#efe7d6',
        roughness: 0.35,
        metalness: 0.05,
      })
    }
    return new THREE.MeshStandardMaterial({
      color: '#2b2b33',
      roughness: 0.3,
      metalness: 0.15,
    })
  }, [color])
}

export function Piece({ piece, selected }: PieceProps) {
  const group = useRef<THREE.Group>(null)
  const medallion = useRef<THREE.Group>(null)
  const { camera } = useThree()
  const material = useMaterial(piece.color)
  const parts = useMemo(() => getPieceParts(piece.type), [piece.type])
  const selectSquare = useGameStore((s) => s.selectSquare)

  const skin = useGameStore((s) => s.skins[skinKey(piece.color, piece.type)])
  const [portrait, setPortrait] = useState<THREE.CanvasTexture | null>(null)

  // Build (and rebuild) the medallion texture whenever the skin image changes.
  useEffect(() => {
    let disposed = false
    let created: THREE.CanvasTexture | null = null
    if (skin?.imageUrl) {
      createPortraitTexture(skin.imageUrl).then((tex) => {
        if (disposed) {
          tex.dispose()
          return
        }
        created = tex
        setPortrait(tex)
      })
    } else {
      setPortrait(null)
    }
    return () => {
      disposed = true
      created?.dispose()
    }
  }, [skin?.imageUrl])

  const [tx, tz] = squareToWorld(piece.square)

  // Smoothly glide to the target square (movement / capture animation).
  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    const lerp = 1 - Math.pow(0.001, delta)
    g.position.x += (tx - g.position.x) * lerp
    g.position.z += (tz - g.position.z) * lerp
    // Gentle lift while selected.
    const targetY = selected ? 0.12 : 0
    g.position.y += (targetY - g.position.y) * lerp
    // Billboard the portrait medallion towards the camera.
    if (medallion.current) medallion.current.quaternion.copy(camera.quaternion)
  })

  const portraitMaterial = useMemo(
    () =>
      portrait
        ? new THREE.MeshBasicMaterial({ map: portrait, transparent: true, toneMapped: false })
        : null,
    [portrait],
  )

  const medallionY = PIECE_HEIGHT[piece.type] + 0.16
  const medallionR = 0.17

  return (
    <group
      ref={group}
      position={[tx, 0, tz]}
      onClick={(e) => {
        e.stopPropagation()
        selectSquare(piece.square)
      }}
    >
      {parts.map((part, i) => (
        <mesh
          key={i}
          geometry={part.geometry}
          material={material}
          position={part.position}
          rotation={part.rotation}
          castShadow
          receiveShadow
        />
      ))}

      {selected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.28, 0.34, 40]} />
          <meshBasicMaterial color="#c8a24a" transparent opacity={0.9} />
        </mesh>
      )}

      {/* Portrait medallion, mounted above the piece and facing the player. */}
      {portraitMaterial && (
        <group ref={medallion} position={[0, medallionY, 0]}>
          <mesh material={portraitMaterial}>
            <circleGeometry args={[medallionR, 48]} />
          </mesh>
          {/* Golden rim around the portrait. */}
          <mesh position={[0, 0, -0.005]}>
            <ringGeometry args={[medallionR, medallionR + 0.025, 48]} />
            <meshStandardMaterial color="#c8a24a" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      )}
    </group>
  )
}
