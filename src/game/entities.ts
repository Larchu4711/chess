import type { Move, Square } from 'chess.js'
import type { BoardPiece, PieceType } from './types'

/**
 * A physical piece with a stable identity that persists across moves, so the 3D
 * scene can render each piece as a single long-lived component and animate it
 * gliding from square to square. chess.js has no piece IDs, so we assign our own
 * and update them incrementally from the flags of each verbose Move.
 */
export interface PieceEntity extends BoardPiece {
  id: string
}

let counter = 0
function nextId(): string {
  return `pc${counter++}`
}

/** Fresh entity list from a board snapshot (new game / undo). */
export function buildEntities(pieces: BoardPiece[]): PieceEntity[] {
  return pieces.map((p) => ({ ...p, id: nextId() }))
}

/**
 * Apply a chess.js Move to the entity list, preserving identities: the mover
 * keeps its id at the destination; captured pieces (incl. en passant) are
 * removed; castling also relocates the rook; promotion changes the mover's type.
 */
export function applyMoveToEntities(entities: PieceEntity[], move: Move): PieceEntity[] {
  const next = entities.map((e) => ({ ...e }))
  const homeRank = move.color === 'w' ? '1' : '8'

  // Remove any captured piece first.
  let filtered = next
  if (move.flags.includes('e')) {
    // En passant: the captured pawn sits on the destination file, origin rank.
    const capturedSquare = (move.to[0] + move.from[1]) as Square
    filtered = next.filter((e) => e.square !== capturedSquare)
  } else if (move.flags.includes('c')) {
    filtered = next.filter((e) => e.square !== move.to)
  }

  // Relocate the moving piece.
  const mover = filtered.find((e) => e.square === move.from)
  if (mover) {
    mover.square = move.to
    if (move.promotion) mover.type = move.promotion as PieceType
  }

  // Move the rook when castling.
  if (move.flags.includes('k')) {
    const rook = filtered.find((e) => e.square === (('h' + homeRank) as Square))
    if (rook) rook.square = ('f' + homeRank) as Square
  } else if (move.flags.includes('q')) {
    const rook = filtered.find((e) => e.square === (('a' + homeRank) as Square))
    if (rook) rook.square = ('d' + homeRank) as Square
  }

  return filtered
}
