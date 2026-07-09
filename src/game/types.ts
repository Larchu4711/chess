import type { Square } from 'chess.js'

export type { Square }

/** Chess colors as used by chess.js: 'w' = white, 'b' = black. */
export type Color = 'w' | 'b'

/** Piece types as used by chess.js. */
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k'

export const PIECE_TYPES: PieceType[] = ['p', 'n', 'b', 'r', 'q', 'k']

export const PIECE_LABEL_DE: Record<PieceType, string> = {
  p: 'Bauer',
  n: 'Springer',
  b: 'Läufer',
  r: 'Turm',
  q: 'Dame',
  k: 'König',
}

export const PIECE_GLYPH: Record<PieceType, string> = {
  p: '♟',
  n: '♞',
  b: '♝',
  r: '♜',
  q: '♛',
  k: '♚',
}

/** A single piece placed on a square, derived from chess.js board(). */
export interface BoardPiece {
  square: Square
  type: PieceType
  color: Color
}

/** Difficulty of the built-in AI opponent (search depth grows with level). */
export type Difficulty = 1 | 2 | 3 | 4

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  1: 'Anfänger',
  2: 'Fortgeschritten',
  3: 'Stark',
  4: 'Experte',
}

/** Key identifying a customizable skin slot: color + piece type. */
export type SkinKey = `${Color}${PieceType}`

export function skinKey(color: Color, type: PieceType): SkinKey {
  return `${color}${type}` as SkinKey
}
