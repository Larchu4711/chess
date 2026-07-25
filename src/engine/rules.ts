/** Partieende: Matt, Patt und die Remis-Regeln. */

import { Position } from './board';
import { generateLegalMoves, isInCheck } from './moves';
import {
  BISHOP,
  Color,
  EMPTY,
  KNIGHT,
  SQUARES,
  pieceColor,
  pieceType,
  sqFile,
  sqRank,
} from './types';

export type GameResult =
  | { over: false }
  | { over: true; kind: 'checkmate'; winner: Color }
  | { over: true; kind: 'stalemate' | 'fifty-move' | 'repetition' | 'insufficient-material' };

/**
 * Materialmangel: König gegen König, König und Läufer bzw. Springer gegen
 * König, sowie Läufer gegen Läufer auf gleicher Feldfarbe.
 */
export function hasInsufficientMaterial(pos: Position): boolean {
  const minors: { color: Color; type: number; square: number }[] = [];

  for (const sq of SQUARES) {
    const piece = pos.board[sq];
    if (piece === EMPTY) continue;
    const type = pieceType(piece);
    if (type === 6) continue; // König
    if (type !== BISHOP && type !== KNIGHT) return false; // Bauer, Turm oder Dame
    minors.push({ color: pieceColor(piece), type, square: sq });
  }

  if (minors.length === 0) return true;
  if (minors.length === 1) return true;
  if (minors.length === 2) {
    const [a, b] = minors;
    if (a.type === BISHOP && b.type === BISHOP && a.color !== b.color) {
      const colorA = (sqFile(a.square) + sqRank(a.square)) & 1;
      const colorB = (sqFile(b.square) + sqRank(b.square)) & 1;
      return colorA === colorB;
    }
  }
  return false;
}

/**
 * Ergebnis der Stellung. `repetitionCount` ist die Häufigkeit, mit der die
 * aktuelle Stellung in der Partie bereits aufgetreten ist (inklusive jetzt).
 */
export function gameResult(pos: Position, repetitionCount = 1): GameResult {
  const legal = generateLegalMoves(pos);
  if (legal.length === 0) {
    if (isInCheck(pos)) {
      return { over: true, kind: 'checkmate', winner: (pos.turn ^ 1) as Color };
    }
    return { over: true, kind: 'stalemate' };
  }
  if (pos.halfmove >= 100) return { over: true, kind: 'fifty-move' };
  if (repetitionCount >= 3) return { over: true, kind: 'repetition' };
  if (hasInsufficientMaterial(pos)) return { over: true, kind: 'insufficient-material' };
  return { over: false };
}
