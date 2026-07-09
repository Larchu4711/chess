import { useMemo } from 'react'
import * as THREE from 'three'
import type { Square } from 'chess.js'
import { ALL_SQUARES, isLightSquare, squareToWorld } from './coords'
import { useGameStore } from '../store/gameStore'

const LIGHT = new THREE.MeshStandardMaterial({ color: '#d8c6a3', roughness: 0.6, metalness: 0.05 })
const DARK = new THREE.MeshStandardMaterial({ color: '#6b4a30', roughness: 0.6, metalness: 0.05 })
const FRAME = new THREE.MeshStandardMaterial({ color: '#3a2417', roughness: 0.5, metalness: 0.1 })

export function Board() {
  const selected = useGameStore((s) => s.selected)
  const legalTargets = useGameStore((s) => s.legalTargets)
  const lastMove = useGameStore((s) => s.lastMove)
  const selectSquare = useGameStore((s) => s.selectSquare)

  const targetSet = useMemo(() => new Set(legalTargets), [legalTargets])

  return (
    <group>
      {/* Board frame / plinth. */}
      <mesh position={[0, -0.08, 0]} receiveShadow material={FRAME}>
        <boxGeometry args={[9.2, 0.16, 9.2]} />
      </mesh>

      {ALL_SQUARES.map((square) => (
        <SquareTile
          key={square}
          square={square}
          isSelected={selected === square}
          isTarget={targetSet.has(square)}
          isLastMove={lastMove?.from === square || lastMove?.to === square}
          onSelect={selectSquare}
        />
      ))}
    </group>
  )
}

interface TileProps {
  square: Square
  isSelected: boolean
  isTarget: boolean
  isLastMove: boolean
  onSelect: (square: Square) => void
}

function SquareTile({ square, isSelected, isTarget, isLastMove, onSelect }: TileProps) {
  const [x, z] = squareToWorld(square)
  const material = isLightSquare(square) ? LIGHT : DARK

  return (
    <group position={[x, 0, z]}>
      <mesh
        receiveShadow
        material={material}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(square)
        }}
      >
        <boxGeometry args={[1, 0.12, 1]} />
      </mesh>

      {/* Highlight overlays sit just above the tile surface. */}
      {(isSelected || isLastMove) && (
        <mesh position={[0, 0.062, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            color={isSelected ? '#c8a24a' : '#6ea8fe'}
            transparent
            opacity={isSelected ? 0.4 : 0.28}
          />
        </mesh>
      )}

      {isTarget && (
        <mesh
          position={[0, 0.063, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={(e) => {
            e.stopPropagation()
            onSelect(square)
          }}
        >
          <circleGeometry args={[0.16, 24]} />
          <meshBasicMaterial color="#6ff0a0" transparent opacity={0.75} />
        </mesh>
      )}
    </group>
  )
}
