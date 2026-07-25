/**
 * Suche: Negamax mit Alpha-Beta-Schnitt, Ruhesuche und iterativer Vertiefung.
 *
 * Die Spielstärke wird über Suchtiefe, Zeitbudget und eine erlaubte
 * Nachlässigkeit gesteuert: Die schwachen Stufen greifen zu Zügen, die messbar
 * schlechter sind als der beste — aber eben nur um einen begrenzten Betrag,
 * damit sie plausibel verlieren statt sinnlos herumzuirren.
 */

import { Position, makeMove, unmakeMove } from '../engine/board';
import { generateMoves, isInCheck } from '../engine/moves';
import { EMPTY, Move, WHITE, pieceType } from '../engine/types';
import { PIECE_VALUE, evaluate } from './evaluate';

const MATE = 100000;
const INFINITY = 1000000;

export interface SearchOptions {
  maxDepth: number;
  /** Zeitbudget in Millisekunden. */
  timeMs: number;
  /**
   * Nachlässigkeit in Centibauern. Bei einem Wert größer 0 wählt die Engine
   * zufällig unter allen Zügen, die höchstens so viel schlechter sind als der
   * beste — so verliert sie plausibel, statt zufällig zu stolpern.
   */
  noise: number;
}

export interface SearchResult {
  move: Move | null;
  score: number;
  depth: number;
  nodes: number;
}

export const LEVELS: Record<string, SearchOptions> = {
  anfaenger: { maxDepth: 1, timeMs: 300, noise: 250 },
  leicht: { maxDepth: 2, timeMs: 800, noise: 120 },
  mittel: { maxDepth: 3, timeMs: 1500, noise: 40 },
  stark: { maxDepth: 5, timeMs: 3000, noise: 0 },
};

class Searcher {
  nodes = 0;
  private deadline = 0;
  private aborted = false;

  private outOfTime(): boolean {
    if (this.aborted) return true;
    // Die Uhr nur alle 1024 Knoten lesen — Date.now() ist im heißen Pfad teuer.
    if ((this.nodes & 1023) === 0 && Date.now() > this.deadline) this.aborted = true;
    return this.aborted;
  }

  search(pos: Position, options: SearchOptions): SearchResult {
    this.deadline = Date.now() + options.timeMs;
    this.aborted = false;
    this.nodes = 0;

    const rootMoves = this.legalMoves(pos);
    if (rootMoves.length === 0) return { move: null, score: 0, depth: 0, nodes: 0 };

    // Bei Nachlässigkeit brauchen wir für jeden Wurzelzug die echte Bewertung,
    // nicht nur eine Alpha-Beta-Schranke — sonst wären die Werte nicht
    // vergleichbar und die Auswahl unter „fast gleich guten" Zügen sinnlos.
    const exactRootScores = options.noise > 0;

    let best: Move = rootMoves[0];
    let bestScore = 0;
    let reachedDepth = 0;

    for (let depth = 1; depth <= options.maxDepth; depth++) {
      const scored = this.searchRoot(pos, rootMoves, depth, best, exactRootScores);
      if (this.aborted || scored.length === 0) break;

      const top = scored.reduce((a, b) => (b.score > a.score ? b : a));
      const chosen = exactRootScores ? pickLenient(scored, top.score, options.noise) : top;

      best = chosen.move;
      bestScore = chosen.score;
      reachedDepth = depth;

      // Ein sicheres Matt muss nicht tiefer bestätigt werden.
      if (Math.abs(top.score) > MATE - 100) break;
    }

    return { move: best, score: bestScore, depth: reachedDepth, nodes: this.nodes };
  }

  /**
   * Bewertet alle Wurzelzüge. Mit `exact` bekommt jeder Zug ein volles
   * Suchfenster und damit eine echte Bewertung; sonst wird das Fenster
   * fortlaufend enger gezogen, was schneller ist, aber nur den besten Zug
   * zuverlässig bestimmt.
   */
  private searchRoot(
    pos: Position,
    moves: Move[],
    depth: number,
    preferred: Move | null,
    exact: boolean,
  ): { move: Move; score: number }[] {
    const out: { move: Move; score: number }[] = [];
    let alpha = -INFINITY;

    // Der bisher beste Zug zuerst — das verbessert die Schnitte deutlich.
    for (const m of this.orderMoves(pos, moves, preferred)) {
      const undo = makeMove(pos, m);
      const score = -this.negamax(pos, depth - 1, -INFINITY, exact ? INFINITY : -alpha, 1);
      unmakeMove(pos, undo);

      if (this.aborted) break;
      out.push({ move: m, score });
      if (!exact && score > alpha) alpha = score;
    }
    return out;
  }

  private legalMoves(pos: Position): Move[] {
    const us = pos.turn;
    const out: Move[] = [];
    for (const m of generateMoves(pos)) {
      const undo = makeMove(pos, m);
      if (!isInCheck(pos, us)) out.push(m);
      unmakeMove(pos, undo);
    }
    return out;
  }

  /** MVV-LVA: wertvolle Beute mit billigem Angreifer zuerst. */
  private orderMoves(_pos: Position, moves: Move[], preferred: Move | null): Move[] {
    const scored = moves.map((m) => {
      let score = 0;
      if (
        preferred &&
        m.from === preferred.from &&
        m.to === preferred.to &&
        m.promotion === preferred.promotion
      ) {
        score += 1_000_000;
      }
      if (m.captured !== EMPTY) {
        score += 10_000 + PIECE_VALUE[pieceType(m.captured)] - PIECE_VALUE[pieceType(m.piece)] / 10;
      }
      if (m.promotion) score += PIECE_VALUE[m.promotion];
      return { m, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.map((entry) => entry.m);
  }

  private negamax(pos: Position, depth: number, alpha: number, beta: number, ply: number): number {
    this.nodes++;
    if (this.outOfTime()) return 0;

    if (depth <= 0) return this.quiescence(pos, alpha, beta, ply);

    const us = pos.turn;
    const moves = this.orderMoves(pos, generateMoves(pos), null);
    let legalCount = 0;
    let value = -INFINITY;

    for (const m of moves) {
      const undo = makeMove(pos, m);
      if (isInCheck(pos, us)) {
        unmakeMove(pos, undo);
        continue;
      }
      legalCount++;
      const score = -this.negamax(pos, depth - 1, -beta, -alpha, ply + 1);
      unmakeMove(pos, undo);

      if (this.aborted) return 0;
      if (score > value) value = score;
      if (value > alpha) alpha = value;
      if (alpha >= beta) break;
    }

    if (legalCount === 0) {
      // Matt wird umso schlechter bewertet, je früher es eintritt.
      return isInCheck(pos, us) ? -MATE + ply : 0;
    }
    if (pos.halfmove >= 100) return 0;

    return value;
  }

  /**
   * Ruhesuche: nur noch Schlagzüge und Umwandlungen, damit die Bewertung
   * nicht mitten in einem Abtausch stehenbleibt.
   */
  private quiescence(pos: Position, alpha: number, beta: number, ply: number): number {
    this.nodes++;
    if (this.outOfTime()) return 0;

    const perspective = pos.turn === WHITE ? 1 : -1;
    const standPat = evaluate(pos) * perspective;
    if (standPat >= beta) return beta;
    if (standPat > alpha) alpha = standPat;

    const us = pos.turn;
    const captures = this.orderMoves(pos, generateMoves(pos, true), null);

    for (const m of captures) {
      const undo = makeMove(pos, m);
      if (isInCheck(pos, us)) {
        unmakeMove(pos, undo);
        continue;
      }
      const score = -this.quiescence(pos, -beta, -alpha, ply + 1);
      unmakeMove(pos, undo);

      if (this.aborted) return 0;
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }

    return alpha;
  }
}

/** Wählt zufällig unter den Zügen, die höchstens `noise` schlechter sind. */
function pickLenient(
  scored: { move: Move; score: number }[],
  bestScore: number,
  noise: number,
): { move: Move; score: number } {
  const candidates = scored.filter((entry) => entry.score >= bestScore - noise);
  return candidates[Math.floor(Math.random() * candidates.length)] ?? scored[0];
}

export function searchBestMove(pos: Position, options: SearchOptions): SearchResult {
  return new Searcher().search(pos, options);
}
