import { useGameStore } from '../store/gameStore'
import { DIFFICULTY_LABEL } from '../game/types'
import type { Difficulty } from '../game/types'

const LEVELS: Difficulty[] = [1, 2, 3, 4]

export function GameControls() {
  const difficulty = useGameStore((s) => s.difficulty)
  const setDifficulty = useGameStore((s) => s.setDifficulty)
  const newGame = useGameStore((s) => s.newGame)
  const undoMove = useGameStore((s) => s.undoMove)
  const thinking = useGameStore((s) => s.thinking)
  const historyLen = useGameStore((s) => s.history.length)

  return (
    <div className="section">
      <h2>Spiel</h2>

      <div className="field">
        <label>Schwierigkeit</label>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(Number(e.target.value) as Difficulty)}
        >
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {DIFFICULTY_LABEL[l]}
            </option>
          ))}
        </select>
      </div>

      <div className="row">
        <button className="btn primary" onClick={newGame}>
          Neues Spiel
        </button>
        <button className="btn" onClick={undoMove} disabled={thinking || historyLen === 0}>
          Zug zurück
        </button>
      </div>
    </div>
  )
}
