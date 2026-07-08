import { Suspense, useState } from 'react'
import { Scene } from './three/Scene'
import { StatusBar } from './ui/StatusBar'
import { GameControls } from './ui/GameControls'
import { MoveHistory } from './ui/MoveHistory'
import { PieceCustomizer } from './ui/PieceCustomizer'
import { useGameStore } from './store/gameStore'

export default function App() {
  const [panelOpen, setPanelOpen] = useState(true)
  const thinking = useGameStore((s) => s.thinking)

  return (
    <>
      <Suspense fallback={<div className="loading-screen"><span className="spinner" /> Lade 3D-Szene…</div>}>
        <Scene />
      </Suspense>

      {thinking && (
        <div className="thinking">
          <span className="spinner" /> Computer denkt nach…
        </div>
      )}

      <aside className={`panel ${panelOpen ? '' : 'collapsed'}`}>
        <div className="panel-scroll">
          <div className="brand">
            <h1>Foto-Schach<span className="dot">.</span>3D</h1>
          </div>
          <p className="tagline">Spiele gegen den Computer — mit deinen eigenen Gesichtern auf den Figuren.</p>

          <div className="section">
            <StatusBar />
          </div>

          <GameControls />
          <PieceCustomizer />
          <MoveHistory />
        </div>
      </aside>

      <button
        className={`panel-toggle ${panelOpen ? '' : 'collapsed'}`}
        onClick={() => setPanelOpen((v) => !v)}
      >
        {panelOpen ? '›' : '‹ Menü'}
      </button>
    </>
  )
}
