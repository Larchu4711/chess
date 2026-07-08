import { useGameStore } from '../store/gameStore'

export function MoveHistory() {
  const history = useGameStore((s) => s.history)

  const rows: { num: number; white: string; black: string }[] = []
  for (let i = 0; i < history.length; i += 2) {
    rows.push({
      num: i / 2 + 1,
      white: history[i],
      black: history[i + 1] ?? '',
    })
  }

  return (
    <div className="section">
      <h2>Zugverlauf</h2>
      <div className="moves">
        {rows.length === 0 ? (
          <div className="empty">Noch keine Züge.</div>
        ) : (
          rows.map((r) => (
            <div className="ply-row" key={r.num}>
              <span className="num">{r.num}.</span>
              <span>{r.white}</span>
              <span>{r.black}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
