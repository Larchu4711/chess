/**
 * Stellung und Zugausführung.
 *
 * `makeMove` verändert die Stellung an Ort und Stelle und liefert einen
 * Undo-Datensatz zurück, mit dem `unmakeMove` sie exakt wiederherstellt.
 * Die Suche verlässt sich darauf, dass dieses Paar verlustfrei ist.
 */

import {
  BLACK,
  CASTLE_BK,
  CASTLE_BQ,
  CASTLE_WK,
  CASTLE_WQ,
  Color,
  EMPTY,
  FLAG_CASTLE_KING,
  FLAG_CASTLE_QUEEN,
  FLAG_DOUBLE_PUSH,
  FLAG_EN_PASSANT,
  KING,
  Move,
  PAWN,
  PieceType,
  WHITE,
  makePiece,
  pieceColor,
  pieceType,
} from './types';

export interface Position {
  board: Int8Array;
  turn: Color;
  castling: number;
  /** Zielfeld für en passant, oder -1. */
  ep: number;
  halfmove: number;
  fullmove: number;
  /** Königsfelder, indiziert nach Farbe. */
  kings: [number, number];
}

export interface Undo {
  move: Move;
  castling: number;
  ep: number;
  halfmove: number;
  fullmove: number;
}

export function emptyPosition(): Position {
  return {
    board: new Int8Array(128),
    turn: WHITE,
    castling: 0,
    ep: -1,
    halfmove: 0,
    fullmove: 1,
    kings: [-1, -1],
  };
}

export function clonePosition(pos: Position): Position {
  return {
    board: Int8Array.from(pos.board),
    turn: pos.turn,
    castling: pos.castling,
    ep: pos.ep,
    halfmove: pos.halfmove,
    fullmove: pos.fullmove,
    kings: [pos.kings[0], pos.kings[1]],
  };
}

/**
 * Rochaderechte erlöschen, sobald ein Turmfeld berührt wird — egal ob der Turm
 * dort wegzieht oder dort geschlagen wird.
 */
function clearRightsForSquare(pos: Position, sq: number): void {
  if (sq === 0) pos.castling &= ~CASTLE_WQ;
  else if (sq === 7) pos.castling &= ~CASTLE_WK;
  else if (sq === 112) pos.castling &= ~CASTLE_BQ;
  else if (sq === 119) pos.castling &= ~CASTLE_BK;
}

export function makeMove(pos: Position, m: Move): Undo {
  const undo: Undo = {
    move: m,
    castling: pos.castling,
    ep: pos.ep,
    halfmove: pos.halfmove,
    fullmove: pos.fullmove,
  };

  const b = pos.board;
  const us = pieceColor(m.piece);

  b[m.from] = EMPTY;

  if (m.flags & FLAG_EN_PASSANT) {
    const capturedSquare = us === WHITE ? m.to - 16 : m.to + 16;
    b[capturedSquare] = EMPTY;
  }

  b[m.to] = m.promotion ? makePiece(us, m.promotion as PieceType) : m.piece;

  if (m.flags & FLAG_CASTLE_KING) {
    const rookFrom = us === WHITE ? 7 : 119;
    const rookTo = us === WHITE ? 5 : 117;
    b[rookTo] = b[rookFrom];
    b[rookFrom] = EMPTY;
  } else if (m.flags & FLAG_CASTLE_QUEEN) {
    const rookFrom = us === WHITE ? 0 : 112;
    const rookTo = us === WHITE ? 3 : 115;
    b[rookTo] = b[rookFrom];
    b[rookFrom] = EMPTY;
  }

  if (pieceType(m.piece) === KING) {
    pos.kings[us] = m.to;
    pos.castling &= us === WHITE ? ~(CASTLE_WK | CASTLE_WQ) : ~(CASTLE_BK | CASTLE_BQ);
  }
  clearRightsForSquare(pos, m.from);
  clearRightsForSquare(pos, m.to);

  pos.ep = m.flags & FLAG_DOUBLE_PUSH ? (us === WHITE ? m.from + 16 : m.from - 16) : -1;

  if (pieceType(m.piece) === PAWN || m.captured !== EMPTY) pos.halfmove = 0;
  else pos.halfmove++;

  if (us === BLACK) pos.fullmove++;
  pos.turn = (us ^ 1) as Color;

  return undo;
}

export function unmakeMove(pos: Position, undo: Undo): void {
  const m = undo.move;
  const b = pos.board;
  const us = pieceColor(m.piece);

  pos.turn = us;
  pos.castling = undo.castling;
  pos.ep = undo.ep;
  pos.halfmove = undo.halfmove;
  pos.fullmove = undo.fullmove;

  b[m.from] = m.piece;
  b[m.to] = EMPTY;

  if (m.flags & FLAG_EN_PASSANT) {
    const capturedSquare = us === WHITE ? m.to - 16 : m.to + 16;
    b[capturedSquare] = m.captured;
  } else if (m.captured !== EMPTY) {
    b[m.to] = m.captured;
  }

  if (m.flags & FLAG_CASTLE_KING) {
    const rookFrom = us === WHITE ? 7 : 119;
    const rookTo = us === WHITE ? 5 : 117;
    b[rookFrom] = b[rookTo];
    b[rookTo] = EMPTY;
  } else if (m.flags & FLAG_CASTLE_QUEEN) {
    const rookFrom = us === WHITE ? 0 : 112;
    const rookTo = us === WHITE ? 3 : 115;
    b[rookFrom] = b[rookTo];
    b[rookTo] = EMPTY;
  }

  if (pieceType(m.piece) === KING) pos.kings[us] = m.from;
}
