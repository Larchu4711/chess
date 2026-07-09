import type { AiRequest, AiResponse } from './aiWorker'
import type { Difficulty } from './types'
import type { Square } from 'chess.js'

/** Search depth and randomness tuning per difficulty level. */
const TUNING: Record<Difficulty, { depth: number; randomness: number }> = {
  1: { depth: 1, randomness: 3 },
  2: { depth: 2, randomness: 1 },
  3: { depth: 3, randomness: 0 },
  4: { depth: 4, randomness: 0 },
}

export interface BestMove {
  from: Square
  to: Square
  promotion?: string
}

/**
 * Main-thread handle to the AI web worker. Sends a FEN + difficulty and
 * resolves with the engine's chosen move. One request at a time is enough for
 * a turn-based game; each call is tagged with an id so stale replies are
 * ignored (e.g. after a "new game").
 */
export class ChessAI {
  private worker: Worker
  private nextId = 1
  private pending = new Map<number, (move: BestMove | null) => void>()

  constructor() {
    this.worker = new Worker(new URL('./aiWorker.ts', import.meta.url), {
      type: 'module',
    })
    this.worker.onmessage = (e: MessageEvent<AiResponse>) => {
      const resolve = this.pending.get(e.data.id)
      if (!resolve) return
      this.pending.delete(e.data.id)
      resolve(parseMove(e.data.move))
    }
  }

  bestMove(fen: string, difficulty: Difficulty): Promise<BestMove | null> {
    const { depth, randomness } = TUNING[difficulty]
    const id = this.nextId++
    const req: AiRequest = { id, fen, depth, randomness }
    return new Promise((resolve) => {
      this.pending.set(id, resolve)
      this.worker.postMessage(req)
    })
  }

  /** Drop any in-flight request handlers (used when starting a new game). */
  cancelAll(): void {
    for (const resolve of this.pending.values()) resolve(null)
    this.pending.clear()
  }

  dispose(): void {
    this.cancelAll()
    this.worker.terminate()
  }
}

function parseMove(uci: string | null): BestMove | null {
  if (!uci || uci.length < 4) return null
  return {
    from: uci.slice(0, 2) as Square,
    to: uci.slice(2, 4) as Square,
    promotion: uci.length > 4 ? uci.slice(4) : undefined,
  }
}
