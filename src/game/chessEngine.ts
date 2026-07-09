import { Chess } from 'chess.js'
import type { Move, Square } from 'chess.js'
import type { BoardPiece, Color } from './types'

/**
 * Thin, UI-friendly wrapper around chess.js. Owns a single Chess instance and
 * exposes exactly what the game store and 3D scene need: legal targets for a
 * square, applying a move, board layout, and game status.
 */
export class ChessEngine {
  private chess: Chess

  constructor(fen?: string) {
    this.chess = new Chess(fen)
  }

  fen(): string {
    return this.chess.fen()
  }

  load(fen: string): void {
    this.chess.load(fen)
  }

  reset(): void {
    this.chess.reset()
  }

  turn(): Color {
    return this.chess.turn()
  }

  /** Flat list of pieces currently on the board. */
  pieces(): BoardPiece[] {
    const result: BoardPiece[] = []
    const grid = this.chess.board()
    for (const row of grid) {
      for (const cell of row) {
        if (cell) {
          result.push({ square: cell.square, type: cell.type, color: cell.color })
        }
      }
    }
    return result
  }

  /** Destination squares of every legal move from `from`. */
  legalTargets(from: Square): Square[] {
    return this.chess.moves({ square: from, verbose: true }).map((m) => m.to)
  }

  /**
   * Apply a move. Always promotes to queen for simplicity (MVP). Returns the
   * verbose Move object (from/to/flags/captured/promotion/san), or null if the
   * move was illegal. Callers use the flags to animate the board incrementally.
   */
  move(from: Square, to: Square): Move | null {
    try {
      return this.chess.move({ from, to, promotion: 'q' })
    } catch {
      // chess.js throws on an illegal move; treat as rejected.
      return null
    }
  }

  undo(): void {
    this.chess.undo()
  }

  history(): string[] {
    return this.chess.history()
  }

  isCheck(): boolean {
    return this.chess.inCheck()
  }

  isCheckmate(): boolean {
    return this.chess.isCheckmate()
  }

  isStalemate(): boolean {
    return this.chess.isStalemate()
  }

  isDraw(): boolean {
    return this.chess.isDraw()
  }

  isGameOver(): boolean {
    return this.chess.isGameOver()
  }
}
