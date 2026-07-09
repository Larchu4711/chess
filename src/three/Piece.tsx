import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type { BoardPiece } from '../game/types'
import { getPieceParts, PIECE_HEIGHT } from './pieceGeometry'
import { squareToWorld } from './coords'
import { createFaceTexture } from '../pieces/portraitTexture'
import { Bust } from './Bust'
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
  const material = useMaterial(piece.color)
  const parts = useMemo(() => getPieceParts(piece.type), [piece.type])
  const selectSquare = useGameStore((s) => s.selectSquare)

  const skin = useGameStore((s) => s.skins[skinKey(piece.color, piece.type)])
  const [portrait, setPortrait] = useState<THREE.CanvasTexture | null>(null)

  // Build (and rebuild) the face texture whenever the skin image changes.
  useEffect(() => {
    let disposed = false
    let created: THREE.CanvasTexture | null = null
    if (skin?.imageUrl) {
      createFaceTexture(skin.imageUrl).then((tex) => {
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

  // Place the piece at its square on first mount (no glide from the origin);
  // afterwards useFrame drives the position so square changes animate.
  useLayoutEffect(() => {
    if (group.current) group.current.position.set(tx, 0, tz)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
  })

  // Mount the 3D portrait head just above the top of the piece.
  const bustY = PIECE_HEIGHT[piece.type] + 0.28

  return (
    <group
      ref={group}
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

      {/* Sculpted 3D portrait head carrying the uploaded photo. */}
      {portrait && <Bust texture={portrait} color={piece.color} y={bustY} />}
    </group>
  )
}
