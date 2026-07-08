import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
import { useGameStore } from './store/gameStore'

// Dev-only hook: expose the game store so end-to-end tests can drive a game.
if (import.meta.env.DEV) {
  ;(window as unknown as { __gameStore?: typeof useGameStore }).__gameStore = useGameStore
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
