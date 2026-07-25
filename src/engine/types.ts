/**
 * Grundtypen der Schach-Engine.
 *
 * Brettdarstellung: 0x88. Das Brett ist ein Array mit 128 Feldern, von denen
 * nur die "linke" Hälfte jeder Zeile echte Felder sind. Ein Feldindex ist
 * genau dann auf dem Brett, wenn (index & 0x88) === 0. Das macht die
 * Randprüfung bei der Zuggenerierung zu einer einzigen Bit-Operation.
 *
 * Feldindex = rank * 16 + file, wobei rank 0 die 1. Reihe ist und file 0
 * die a-Linie. a1 = 0, h1 = 7, a8 = 112, h8 = 119.
 */

export type Color = 0 | 1;
export const WHITE: Color = 0;
export const BLACK: Color = 1;

export const PAWN = 1;
export const KNIGHT = 2;
export const BISHOP = 3;
export const ROOK = 4;
export const QUEEN = 5;
export const KING = 6;

export type PieceType = 1 | 2 | 3 | 4 | 5 | 6;

/** Leeres Feld. */
export const EMPTY = 0;

/** Eine Figur ist `typ | (farbe << 3)`, also 1..6 für Weiß und 9..14 für Schwarz. */
export function makePiece(color: Color, type: PieceType): number {
  return type | (color << 3);
}

export function pieceType(piece: number): PieceType {
  return (piece & 7) as PieceType;
}

export function pieceColor(piece: number): Color {
  return ((piece >> 3) & 1) as Color;
}

export function opposite(color: Color): Color {
  return (color ^ 1) as Color;
}

/* Rochaderechte als Bitmaske. */
export const CASTLE_WK = 1;
export const CASTLE_WQ = 2;
export const CASTLE_BK = 4;
export const CASTLE_BQ = 8;

/* Zug-Flags. */
export const FLAG_NONE = 0;
export const FLAG_DOUBLE_PUSH = 1;
export const FLAG_EN_PASSANT = 2;
export const FLAG_CASTLE_KING = 4;
export const FLAG_CASTLE_QUEEN = 8;

export interface Move {
  from: number;
  to: number;
  /** Die ziehende Figur (inkl. Farbbit), vor einer eventuellen Umwandlung. */
  piece: number;
  /** Die geschlagene Figur, oder EMPTY. Bei en passant der geschlagene Bauer. */
  captured: number;
  /** Umwandlungsfigur (nur der Typ) oder 0. */
  promotion: number;
  flags: number;
}

export function sqFile(sq: number): number {
  return sq & 7;
}

export function sqRank(sq: number): number {
  return sq >> 4;
}

export function onBoard(sq: number): boolean {
  return (sq & 0x88) === 0;
}

export function squareName(sq: number): string {
  return 'abcdefgh'[sqFile(sq)] + String(sqRank(sq) + 1);
}

export function parseSquare(name: string): number {
  const file = name.charCodeAt(0) - 97;
  const rank = name.charCodeAt(1) - 49;
  return rank * 16 + file;
}

/** Alle 64 echten Feldindizes, aufsteigend von a1 bis h8. */
export const SQUARES: number[] = (() => {
  const out: number[] = [];
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) out.push(rank * 16 + file);
  }
  return out;
})();

export function movesEqual(a: Move, b: Move): boolean {
  return a.from === b.from && a.to === b.to && a.promotion === b.promotion;
}
