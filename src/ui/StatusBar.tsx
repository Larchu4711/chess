import { useGameStore } from '../store/gameStore'

export function StatusBar() {
  const status = useGameStore((s) => s.status)
  const turn = useGameStore((s) => s.turn)
  const thinking = useGameStore((s) => s.thinking)

  let text: string
  let cls = ''

  if (status.kind === 'checkmate') {
    text = status.winner === 'w' ? 'Schachmatt — Weiß gewinnt!' : 'Schachmatt — Schwarz gewinnt!'
    cls = 'over'
  } else if (status.kind === 'stalemate') {
    text = 'Patt — unentschieden'
    cls = 'over'
  } else if (status.kind === 'draw') {
    text = 'Remis — unentschieden'
    cls = 'over'
  } else {
    const side = turn === 'w' ? 'Weiß' : 'Schwarz'
    text = thinking ? 'Computer denkt nach…' : `${side} am Zug`
    if (status.check) {
      text += ' — Schach!'
      cls = 'check'
    }
  }

  const chipColor = turn === 'w' ? '#efe7d6' : '#2b2b33'

  return (
    <div className={`status ${cls}`}>
      {status.kind === 'playing' && <span className="turn-chip" style={{ background: chipColor }} />}
      <span>{text}</span>
      {status.kind === 'playing' && (
        <small style={{ marginLeft: 'auto' }}>{turn === 'w' ? 'Du' : 'KI'}</small>
      )}
    </div>
  )
}
