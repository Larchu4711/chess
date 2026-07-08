/// <reference lib="webworker" />
import { Chess } from 'chess.js'
import type { Move } from 'chess.js'

/**
 * Self-contained chess AI running off the main thread. Alpha-beta minimax over
 * chess.js move generation with a material + piece-square-table evaluation.
 * Difficulty maps to search depth; lower levels add randomness so the engine
 * feels beatable. No WASM, no headers, no network — always available offline.
 */

type PieceSymbol = 'p' | 'n' | 'b' | 'r' | 'q' | 'k'

const PIECE_VALUE: Record<PieceSymbol, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
}

// Piece-square tables (from white's perspective, a8..h1 reading order).
// Encourage sensible development, central control and king safety.
// prettier-ignore
const PST: Record<PieceSymbol, number[]> = {
  p: [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,
  ],
  n: [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
  ],
  b: [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
  ],
  r: [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0,
  ],
  q: [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
  ],
  k: [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20,
  ],
}

/** Static evaluation in centipawns, positive = good for the side to move. */
function evaluate(chess: Chess): number {
  let score = 0
  const board = chess.board()
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const cell = board[r][f]
      if (!cell) continue
      const type = cell.type as PieceSymbol
      const base = PIECE_VALUE[type]
      const idx = r * 8 + f // board() is already a8..h1
      const pst = cell.color === 'w' ? PST[type][idx] : PST[type][63 - idx]
      const value = base + pst
      score += cell.color === 'w' ? value : -value
    }
  }
  // Return from the perspective of the side to move.
  return chess.turn() === 'w' ? score : -score
}

/** Order moves so captures/promotions are searched first (better pruning). */
function orderMoves(moves: Move[]): Move[] {
  return [...moves].sort((a, b) => moveScore(b) - moveScore(a))
}

function moveScore(m: Move): number {
  let s = 0
  if (m.captured) {
    s += 10 * PIECE_VALUE[m.captured as PieceSymbol] - PIECE_VALUE[m.piece as PieceSymbol]
  }
  if (m.promotion) s += PIECE_VALUE[m.promotion as PieceSymbol]
  return s
}

const MATE = 1_000_000

function negamax(chess: Chess, depth: number, alpha: number, beta: number): number {
  if (chess.isGameOver()) {
    if (chess.isCheckmate()) return -MATE - depth // prefer faster mates
    return 0 // stalemate / draw
  }
  if (depth === 0) return evaluate(chess)

  let best = -Infinity
  const moves = orderMoves(chess.moves({ verbose: true }) as Move[])
  for (const move of moves) {
    chess.move(move)
    const score = -negamax(chess, depth - 1, -beta, -alpha)
    chess.undo()
    if (score > best) best = score
    if (best > alpha) alpha = best
    if (alpha >= beta) break // beta cutoff
  }
  return best
}

interface Candidate {
  move: Move
  score: number
}

/** Pick the best move for the current side at the given search depth. */
function search(fen: string, depth: number, randomness: number): string | null {
  const chess = new Chess(fen)
  const moves = orderMoves(chess.moves({ verbose: true }) as Move[])
  if (moves.length === 0) return null

  const candidates: Candidate[] = []
  let alpha = -Infinity
  const beta = Infinity
  for (const move of moves) {
    chess.move(move)
    const score = -negamax(chess, depth - 1, -beta, -alpha)
    chess.undo()
    candidates.push({ move, score })
    if (score > alpha) alpha = score
  }

  candidates.sort((a, b) => b.score - a.score)

  // At low difficulty, occasionally pick from near-best moves to feel human.
  if (randomness > 0) {
    const bestScore = candidates[0].score
    const window = 60 * randomness // centipawns
    const pool = candidates.filter((c) => bestScore - c.score <= window)
    const chosen = pool[Math.floor(Math.random() * pool.length)]
    return chosen.move.from + chosen.move.to + (chosen.move.promotion ?? '')
  }

  const best = candidates[0].move
  return best.from + best.to + (best.promotion ?? '')
}

export interface AiRequest {
  id: number
  fen: string
  depth: number
  randomness: number
}

export interface AiResponse {
  id: number
  move: string | null
}

self.onmessage = (e: MessageEvent<AiRequest>) => {
  const { id, fen, depth, randomness } = e.data
  const move = search(fen, depth, randomness)
  const response: AiResponse = { id, move }
  ;(self as unknown as Worker).postMessage(response)
}
