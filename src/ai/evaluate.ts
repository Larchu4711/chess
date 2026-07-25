/**
 * Stellungsbewertung: Material plus Positionstabellen (piece-square tables).
 * Bewertet immer aus Sicht von Weiß; die Suche dreht das Vorzeichen selbst.
 */

import { Position } from '../engine/board';
import {
  BISHOP,
  EMPTY,
  KING,
  KNIGHT,
  PAWN,
  QUEEN,
  ROOK,
  SQUARES,
  WHITE,
  pieceColor,
  pieceType,
  sqFile,
  sqRank,
} from '../engine/types';

export const PIECE_VALUE: Record<number, number> = {
  [PAWN]: 100,
  [KNIGHT]: 320,
  [BISHOP]: 330,
  [ROOK]: 500,
  [QUEEN]: 900,
  [KING]: 20000,
};

/**
 * Die Tabellen sind aus Sicht von Weiß in Lesereihenfolge notiert: der erste
 * Eintrag ist a8, der letzte h1. Für Schwarz wird die Reihe gespiegelt.
 */
const PAWN_PST = [
   0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0,
];

const KNIGHT_PST = [
 -50,-40,-30,-30,-30,-30,-40,-50,
 -40,-20,  0,  0,  0,  0,-20,-40,
 -30,  0, 10, 15, 15, 10,  0,-30,
 -30,  5, 15, 20, 20, 15,  5,-30,
 -30,  0, 15, 20, 20, 15,  0,-30,
 -30,  5, 10, 15, 15, 10,  5,-30,
 -40,-20,  0,  5,  5,  0,-20,-40,
 -50,-40,-30,-30,-30,-30,-40,-50,
];

const BISHOP_PST = [
 -20,-10,-10,-10,-10,-10,-10,-20,
 -10,  0,  0,  0,  0,  0,  0,-10,
 -10,  0,  5, 10, 10,  5,  0,-10,
 -10,  5,  5, 10, 10,  5,  5,-10,
 -10,  0, 10, 10, 10, 10,  0,-10,
 -10, 10, 10, 10, 10, 10, 10,-10,
 -10,  5,  0,  0,  0,  0,  5,-10,
 -20,-10,-10,-10,-10,-10,-10,-20,
];

const ROOK_PST = [
   0,  0,  0,  0,  0,  0,  0,  0,
   5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
   0,  0,  0,  5,  5,  0,  0,  0,
];

const QUEEN_PST = [
 -20,-10,-10, -5, -5,-10,-10,-20,
 -10,  0,  0,  0,  0,  0,  0,-10,
 -10,  0,  5,  5,  5,  5,  0,-10,
  -5,  0,  5,  5,  5,  5,  0, -5,
   0,  0,  5,  5,  5,  5,  0, -5,
 -10,  5,  5,  5,  5,  5,  0,-10,
 -10,  0,  5,  0,  0,  0,  0,-10,
 -20,-10,-10, -5, -5,-10,-10,-20,
];

const KING_MIDDLE_PST = [
 -30,-40,-40,-50,-50,-40,-40,-30,
 -30,-40,-40,-50,-50,-40,-40,-30,
 -30,-40,-40,-50,-50,-40,-40,-30,
 -30,-40,-40,-50,-50,-40,-40,-30,
 -20,-30,-30,-40,-40,-30,-30,-20,
 -10,-20,-20,-20,-20,-20,-20,-10,
  20, 20,  0,  0,  0,  0, 20, 20,
  20, 30, 10,  0,  0, 10, 30, 20,
];

const KING_END_PST = [
 -50,-40,-30,-20,-20,-30,-40,-50,
 -30,-20,-10,  0,  0,-10,-20,-30,
 -30,-10, 20, 30, 30, 20,-10,-30,
 -30,-10, 30, 40, 40, 30,-10,-30,
 -30,-10, 30, 40, 40, 30,-10,-30,
 -30,-10, 20, 30, 30, 20,-10,-30,
 -30,-30,  0,  0,  0,  0,-30,-30,
 -50,-30,-30,-30,-30,-30,-30,-50,
];

const PST: Record<number, number[]> = {
  [PAWN]: PAWN_PST,
  [KNIGHT]: KNIGHT_PST,
  [BISHOP]: BISHOP_PST,
  [ROOK]: ROOK_PST,
  [QUEEN]: QUEEN_PST,
};

/** Ab hier gilt die Stellung als Endspiel und der König marschiert mit. */
const ENDGAME_THRESHOLD = 1300;

export function evaluate(pos: Position): number {
  let score = 0;
  let nonPawnMaterial = 0;
  const bishops = [0, 0];

  // Erster Durchlauf: Material, damit feststeht, ob Endspiel-Königstabelle gilt.
  for (const sq of SQUARES) {
    const piece = pos.board[sq];
    if (piece === EMPTY) continue;
    const type = pieceType(piece);
    if (type !== PAWN && type !== KING) nonPawnMaterial += PIECE_VALUE[type];
    if (type === BISHOP) bishops[pieceColor(piece)]++;
  }
  const endgame = nonPawnMaterial < ENDGAME_THRESHOLD;

  for (const sq of SQUARES) {
    const piece = pos.board[sq];
    if (piece === EMPTY) continue;
    const color = pieceColor(piece);
    const type = pieceType(piece);

    const file = sqFile(sq);
    const rank = sqRank(sq);
    // Weiß liest die Tabelle von oben (a8 = Index 0), Schwarz gespiegelt.
    const index = color === WHITE ? (7 - rank) * 8 + file : rank * 8 + file;

    const table = type === KING ? (endgame ? KING_END_PST : KING_MIDDLE_PST) : PST[type];
    const value = PIECE_VALUE[type] + table[index];
    score += color === WHITE ? value : -value;
  }

  // Läuferpaar ist einen kleinen Bonus wert.
  if (bishops[0] >= 2) score += 30;
  if (bishops[1] >= 2) score -= 30;

  return score;
}
