import { Canvas } from '@react-three/fiber'
import { OrbitControls, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { Board } from './Board'
import { Piece } from './Piece'
import { useGameStore } from '../store/gameStore'
import { skinKey } from '../game/types'

export function Scene() {
  const pieces = useGameStore((s) => s.pieces)
  const selected = useGameStore((s) => s.selected)
  const clearSelection = useGameStore((s) => s.clearSelection)

  return (
    <Canvas
      className="scene"
      shadows
      camera={{ position: [0, 7.5, 8.5], fov: 42 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      onPointerMissed={() => clearSelection()}
    >
      <color attach="background" args={['#0e1116']} />
      <fog attach="fog" args={['#0e1116', 16, 32]} />

      {/* Lighting: soft key light with shadows + warm/cool fills. */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[6, 12, 6]}
        intensity={1.4}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
      />
      <pointLight position={[-8, 5, -6]} intensity={0.4} color="#6ea8fe" />
      <pointLight position={[8, 4, 8]} intensity={0.4} color="#ffd9a0" />

      <Board />

      {pieces.map((piece) => (
        <Piece
          key={skinKey(piece.color, piece.type) + '@' + piece.square}
          piece={piece}
          selected={selected === piece.square}
        />
      ))}

      <ContactShadows position={[0, 0.001, 0]} opacity={0.5} scale={12} blur={2.4} far={4} />

      <OrbitControls
        enablePan={false}
        minDistance={6}
        maxDistance={16}
        maxPolarAngle={Math.PI / 2.15}
        target={[0, 0.5, 0]}
      />
    </Canvas>
  )
}
