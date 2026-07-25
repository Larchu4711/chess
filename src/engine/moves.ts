/**
 * Zuggenerierung.
 *
 * Erzeugt zunächst pseudo-legale Züge und filtert anschließend jene heraus,
 * die den eigenen König im Schach zurücklassen. Das ist langsamer als eine
 * direkte Legalitätsprüfung, aber deutlich schwerer falsch zu machen — und
 * die perft-Tests belegen, dass es stimmt.
 */

import { Position, makeMove, unmakeMove } from './board';
import {
  BISHOP,
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
  FLAG_NONE,
  KING,
  KNIGHT,
  Move,
  PAWN,
  QUEEN,
  ROOK,
  SQUARES,
  WHITE,
  makePiece,
  onBoard,
  opposite,
  pieceColor,
  pieceType,
  sqRank,
} from './types';

const KNIGHT_DIRS = [33, 31, 18, 14, -33, -31, -18, -14];
const BISHOP_DIRS = [17, 15, -15, -17];
const ROOK_DIRS = [16, 1, -1, -16];
const KING_DIRS = [17, 16, 15, 1, -1, -15, -16, -17];

const PROMOTION_PIECES = [QUEEN, ROOK, BISHOP, KNIGHT];

function move(
  from: number,
  to: number,
  piece: number,
  captured: number,
  promotion = 0,
  flags = FLAG_NONE,
): Move {
  return { from, to, piece, captured, promotion, flags };
}

/** Wird `sq` von einer Figur der Farbe `by` angegriffen? */
export function isSquareAttacked(pos: Position, sq: number, by: Color): boolean {
  const b = pos.board;

  // Bauern. Ein weißer Bauer auf s greift s+15 und s+17 an, also kommt ein
  // Angreifer auf sq von sq-15 bzw. sq-17.
  if (by === WHITE) {
    const wp = makePiece(WHITE, PAWN);
    if (onBoard(sq - 15) && b[sq - 15] === wp) return true;
    if (onBoard(sq - 17) && b[sq - 17] === wp) return true;
  } else {
    const bp = makePiece(BLACK, PAWN);
    if (onBoard(sq + 15) && b[sq + 15] === bp) return true;
    if (onBoard(sq + 17) && b[sq + 17] === bp) return true;
  }

  const knight = makePiece(by, KNIGHT);
  for (const d of KNIGHT_DIRS) {
    const t = sq + d;
    if (onBoard(t) && b[t] === knight) return true;
  }

  const king = makePiece(by, KING);
  for (const d of KING_DIRS) {
    const t = sq + d;
    if (onBoard(t) && b[t] === king) return true;
  }

  for (const d of BISHOP_DIRS) {
    let t = sq + d;
    while (onBoard(t)) {
      const p = b[t];
      if (p !== EMPTY) {
        if (pieceColor(p) === by) {
          const type = pieceType(p);
          if (type === BISHOP || type === QUEEN) return true;
        }
        break;
      }
      t += d;
    }
  }

  for (const d of ROOK_DIRS) {
    let t = sq + d;
    while (onBoard(t)) {
      const p = b[t];
      if (p !== EMPTY) {
        if (pieceColor(p) === by) {
          const type = pieceType(p);
          if (type === ROOK || type === QUEEN) return true;
        }
        break;
      }
      t += d;
    }
  }

  return false;
}

export function isInCheck(pos: Position, color: Color = pos.turn): boolean {
  const kingSquare = pos.kings[color];
  if (kingSquare < 0) return false;
  return isSquareAttacked(pos, kingSquare, opposite(color));
}

function addPawnMoves(out: Move[], from: number, to: number, piece: number, captured: number, flags: number, us: Color): void {
  const promotionRank = us === WHITE ? 7 : 0;
  if (sqRank(to) === promotionRank) {
    for (const promo of PROMOTION_PIECES) out.push(move(from, to, piece, captured, promo, flags));
  } else {
    out.push(move(from, to, piece, captured, 0, flags));
  }
}

/**
 * Pseudo-legale Züge. Mit `capturesOnly` werden nur Schlagzüge und
 * Umwandlungen erzeugt — das braucht die Ruhesuche.
 */
export function generateMoves(pos: Position, capturesOnly = false): Move[] {
  const out: Move[] = [];
  const b = pos.board;
  const us = pos.turn;
  const them = opposite(us);

  for (const from of SQUARES) {
    const piece = b[from];
    if (piece === EMPTY || pieceColor(piece) !== us) continue;
    const type = pieceType(piece);

    if (type === PAWN) {
      const forward = us === WHITE ? 16 : -16;
      const startRank = us === WHITE ? 1 : 6;
      const promotionRank = us === WHITE ? 7 : 0;

      const one = from + forward;
      if (onBoard(one) && b[one] === EMPTY) {
        const isPromotion = sqRank(one) === promotionRank;
        if (!capturesOnly || isPromotion) {
          addPawnMoves(out, from, one, piece, EMPTY, FLAG_NONE, us);
        }
        if (!capturesOnly && sqRank(from) === startRank) {
          const two = from + forward * 2;
          if (b[two] === EMPTY) out.push(move(from, two, piece, EMPTY, 0, FLAG_DOUBLE_PUSH));
        }
      }

      for (const d of us === WHITE ? [15, 17] : [-15, -17]) {
        const to = from + d;
        if (!onBoard(to)) continue;
        const target = b[to];
        if (target !== EMPTY && pieceColor(target) === them) {
          addPawnMoves(out, from, to, piece, target, FLAG_NONE, us);
        } else if (target === EMPTY && to === pos.ep) {
          const capturedSquare = us === WHITE ? to - 16 : to + 16;
          out.push(move(from, to, piece, b[capturedSquare], 0, FLAG_EN_PASSANT));
        }
      }
      continue;
    }

    if (type === KNIGHT || type === KING) {
      const dirs = type === KNIGHT ? KNIGHT_DIRS : KING_DIRS;
      for (const d of dirs) {
        const to = from + d;
        if (!onBoard(to)) continue;
        const target = b[to];
        if (target === EMPTY) {
          if (!capturesOnly) out.push(move(from, to, piece, EMPTY));
        } else if (pieceColor(target) !== us) {
          out.push(move(from, to, piece, target));
        }
      }
      continue;
    }

    const dirs = type === BISHOP ? BISHOP_DIRS : type === ROOK ? ROOK_DIRS : KING_DIRS;
    for (const d of dirs) {
      let to = from + d;
      while (onBoard(to)) {
        const target = b[to];
        if (target === EMPTY) {
          if (!capturesOnly) out.push(move(from, to, piece, EMPTY));
        } else {
          if (pieceColor(target) !== us) out.push(move(from, to, piece, target));
          break;
        }
        to += d;
      }
    }
  }

  if (!capturesOnly) addCastlingMoves(out, pos, us, them);

  return out;
}

function addCastlingMoves(out: Move[], pos: Position, us: Color, them: Color): void {
  const b = pos.board;
  const kingSquare = us === WHITE ? 4 : 116;
  const king = makePiece(us, KING);
  if (b[kingSquare] !== king) return;

  const kingSideRight = us === WHITE ? CASTLE_WK : CASTLE_BK;
  const queenSideRight = us === WHITE ? CASTLE_WQ : CASTLE_BQ;
  const rook = makePiece(us, ROOK);

  // Der König darf weder im Schach stehen noch über ein bedrohtes Feld ziehen.
  // Das Zielfeld prüft ohnehin noch der Legalitätsfilter.
  if (pos.castling & kingSideRight) {
    const rookSquare = kingSquare + 3;
    if (
      b[rookSquare] === rook &&
      b[kingSquare + 1] === EMPTY &&
      b[kingSquare + 2] === EMPTY &&
      !isSquareAttacked(pos, kingSquare, them) &&
      !isSquareAttacked(pos, kingSquare + 1, them)
    ) {
      out.push(move(kingSquare, kingSquare + 2, king, EMPTY, 0, FLAG_CASTLE_KING));
    }
  }

  if (pos.castling & queenSideRight) {
    const rookSquare = kingSquare - 4;
    if (
      b[rookSquare] === rook &&
      b[kingSquare - 1] === EMPTY &&
      b[kingSquare - 2] === EMPTY &&
      b[kingSquare - 3] === EMPTY &&
      !isSquareAttacked(pos, kingSquare, them) &&
      !isSquareAttacked(pos, kingSquare - 1, them)
    ) {
      out.push(move(kingSquare, kingSquare - 2, king, EMPTY, 0, FLAG_CASTLE_QUEEN));
    }
  }
}

export function generateLegalMoves(pos: Position): Move[] {
  const us = pos.turn;
  const legal: Move[] = [];
  for (const m of generateMoves(pos)) {
    const undo = makeMove(pos, m);
    if (!isInCheck(pos, us)) legal.push(m);
    unmakeMove(pos, undo);
  }
  return legal;
}

export function isLegal(pos: Position, m: Move): boolean {
  const us = pos.turn;
  const undo = makeMove(pos, m);
  const ok = !isInCheck(pos, us);
  unmakeMove(pos, undo);
  return ok;
}
