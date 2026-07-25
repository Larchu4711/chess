/** FEN einlesen und schreiben. */

import { Position, emptyPosition } from './board';
import {
  BISHOP,
  BLACK,
  CASTLE_BK,
  CASTLE_BQ,
  CASTLE_WK,
  CASTLE_WQ,
  Color,
  EMPTY,
  KING,
  KNIGHT,
  PAWN,
  PieceType,
  QUEEN,
  ROOK,
  SQUARES,
  WHITE,
  makePiece,
  parseSquare,
  pieceColor,
  pieceType,
  squareName,
} from './types';

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const CHAR_TO_TYPE: Record<string, PieceType> = {
  p: PAWN,
  n: KNIGHT,
  b: BISHOP,
  r: ROOK,
  q: QUEEN,
  k: KING,
};

const TYPE_TO_CHAR: Record<number, string> = {
  [PAWN]: 'p',
  [KNIGHT]: 'n',
  [BISHOP]: 'b',
  [ROOK]: 'r',
  [QUEEN]: 'q',
  [KING]: 'k',
};

export function parseFen(fen: string): Position {
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 4) throw new Error(`Ungültige FEN: ${fen}`);
  const [placement, turn, castling, ep, halfmove, fullmove] = parts;

  const pos = emptyPosition();
  const ranks = placement.split('/');
  if (ranks.length !== 8) throw new Error(`Ungültige FEN-Stellung: ${placement}`);

  for (let i = 0; i < 8; i++) {
    const rank = 7 - i;
    let file = 0;
    for (const ch of ranks[i]) {
      if (ch >= '1' && ch <= '8') {
        file += Number(ch);
        continue;
      }
      const type = CHAR_TO_TYPE[ch.toLowerCase()];
      if (!type) throw new Error(`Unbekanntes Figurenzeichen: ${ch}`);
      const color: Color = ch === ch.toUpperCase() ? WHITE : BLACK;
      const sq = rank * 16 + file;
      pos.board[sq] = makePiece(color, type);
      if (type === KING) pos.kings[color] = sq;
      file++;
    }
  }

  pos.turn = turn === 'b' ? BLACK : WHITE;

  pos.castling = 0;
  if (castling.includes('K')) pos.castling |= CASTLE_WK;
  if (castling.includes('Q')) pos.castling |= CASTLE_WQ;
  if (castling.includes('k')) pos.castling |= CASTLE_BK;
  if (castling.includes('q')) pos.castling |= CASTLE_BQ;

  pos.ep = ep && ep !== '-' ? parseSquare(ep) : -1;
  pos.halfmove = halfmove ? Number(halfmove) : 0;
  pos.fullmove = fullmove ? Number(fullmove) : 1;

  return pos;
}

export function toFen(pos: Position): string {
  const rows: string[] = [];
  for (let rank = 7; rank >= 0; rank--) {
    let row = '';
    let empty = 0;
    for (let file = 0; file < 8; file++) {
      const piece = pos.board[rank * 16 + file];
      if (piece === EMPTY) {
        empty++;
        continue;
      }
      if (empty) {
        row += String(empty);
        empty = 0;
      }
      const ch = TYPE_TO_CHAR[pieceType(piece)];
      row += pieceColor(piece) === WHITE ? ch.toUpperCase() : ch;
    }
    if (empty) row += String(empty);
    rows.push(row);
  }

  let castling = '';
  if (pos.castling & CASTLE_WK) castling += 'K';
  if (pos.castling & CASTLE_WQ) castling += 'Q';
  if (pos.castling & CASTLE_BK) castling += 'k';
  if (pos.castling & CASTLE_BQ) castling += 'q';
  if (!castling) castling = '-';

  return [
    rows.join('/'),
    pos.turn === WHITE ? 'w' : 'b',
    castling,
    pos.ep >= 0 ? squareName(pos.ep) : '-',
    String(pos.halfmove),
    String(pos.fullmove),
  ].join(' ');
}

/**
 * Schlüssel für die Stellungswiederholung: alles außer den Zugzählern.
 * Zwei Stellungen gelten als identisch, wenn dieser Schlüssel übereinstimmt.
 */
export function repetitionKey(pos: Position): string {
  let key = '';
  for (const sq of SQUARES) key += String.fromCharCode(65 + pos.board[sq]);
  return `${key}|${pos.turn}|${pos.castling}|${pos.ep}`;
}
