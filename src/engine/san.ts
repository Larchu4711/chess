/** Züge in Standard-Algebraische Notation (SAN) übersetzen. */

import { Position, makeMove, unmakeMove } from './board';
import { generateLegalMoves, isInCheck } from './moves';
import {
  BISHOP,
  EMPTY,
  FLAG_CASTLE_KING,
  FLAG_CASTLE_QUEEN,
  FLAG_EN_PASSANT,
  KING,
  KNIGHT,
  Move,
  PAWN,
  QUEEN,
  ROOK,
  pieceType,
  sqFile,
  sqRank,
  squareName,
} from './types';

const TYPE_LETTER: Record<number, string> = {
  [PAWN]: '',
  [KNIGHT]: 'N',
  [BISHOP]: 'B',
  [ROOK]: 'R',
  [QUEEN]: 'Q',
  [KING]: 'K',
};

/**
 * SAN für `m` in der Stellung `pos`. `legalMoves` kann übergeben werden, wenn
 * die Liste ohnehin schon vorliegt — sie wird für die Eindeutigmachung
 * gebraucht (Nbd2 statt Nd2).
 */
export function moveToSan(pos: Position, m: Move, legalMoves?: Move[]): string {
  if (m.flags & FLAG_CASTLE_KING) return withCheckSuffix(pos, m, 'O-O');
  if (m.flags & FLAG_CASTLE_QUEEN) return withCheckSuffix(pos, m, 'O-O-O');

  const type = pieceType(m.piece);
  const isCapture = m.captured !== EMPTY || (m.flags & FLAG_EN_PASSANT) !== 0;
  let san = '';

  if (type === PAWN) {
    if (isCapture) san += 'abcdefgh'[sqFile(m.from)] + 'x';
    san += squareName(m.to);
    if (m.promotion) san += '=' + TYPE_LETTER[m.promotion];
  } else {
    san += TYPE_LETTER[type];
    san += disambiguation(pos, m, legalMoves ?? generateLegalMoves(pos));
    if (isCapture) san += 'x';
    san += squareName(m.to);
  }

  return withCheckSuffix(pos, m, san);
}

function disambiguation(_pos: Position, m: Move, legalMoves: Move[]): string {
  const rivals = legalMoves.filter(
    (other) =>
      other.to === m.to &&
      other.from !== m.from &&
      other.piece === m.piece,
  );
  if (rivals.length === 0) return '';

  const sameFile = rivals.some((r) => sqFile(r.from) === sqFile(m.from));
  const sameRank = rivals.some((r) => sqRank(r.from) === sqRank(m.from));

  if (!sameFile) return 'abcdefgh'[sqFile(m.from)];
  if (!sameRank) return String(sqRank(m.from) + 1);
  return squareName(m.from);
}

function withCheckSuffix(pos: Position, m: Move, san: string): string {
  const undo = makeMove(pos, m);
  let suffix = '';
  if (isInCheck(pos)) {
    suffix = generateLegalMoves(pos).length === 0 ? '#' : '+';
  }
  unmakeMove(pos, undo);
  return san + suffix;
}
