/**
 * Partie-Zustand: die Stellung plus alles, was man nur aus dem Verlauf weiß —
 * Zugliste, Stellungswiederholungen, Zurücknehmen.
 */

import { Position, Undo, clonePosition, makeMove, unmakeMove } from './board';
import { START_FEN, parseFen, repetitionKey, toFen } from './fen';
import { generateLegalMoves } from './moves';
import { GameResult, gameResult } from './rules';
import { moveToSan } from './san';
import { Color, Move, movesEqual } from './types';

interface HistoryEntry {
  undo: Undo;
  san: string;
  keyBefore: string;
}

export class Game {
  position: Position;
  private history: HistoryEntry[] = [];
  /** Wie oft jede Stellung bisher aufgetreten ist. */
  private repetitions = new Map<string, number>();
  private cachedLegalMoves: Move[] | null = null;

  constructor(fen: string = START_FEN) {
    this.position = parseFen(fen);
    this.bumpRepetition(repetitionKey(this.position), 1);
  }

  private bumpRepetition(key: string, delta: number): void {
    const next = (this.repetitions.get(key) ?? 0) + delta;
    if (next <= 0) this.repetitions.delete(key);
    else this.repetitions.set(key, next);
  }

  get turn(): Color {
    return this.position.turn;
  }

  legalMoves(): Move[] {
    if (!this.cachedLegalMoves) this.cachedLegalMoves = generateLegalMoves(this.position);
    return this.cachedLegalMoves;
  }

  legalMovesFrom(square: number): Move[] {
    return this.legalMoves().filter((m) => m.from === square);
  }

  /** Der Zug, der `from`→`to` (mit optionaler Umwandlung) entspricht, falls legal. */
  findMove(from: number, to: number, promotion = 0): Move | null {
    const candidates = this.legalMoves().filter((m) => m.from === from && m.to === to);
    if (candidates.length === 0) return null;
    if (promotion) return candidates.find((m) => m.promotion === promotion) ?? null;
    return candidates[0];
  }

  play(m: Move): void {
    const legal = this.legalMoves().find((candidate) => movesEqual(candidate, m));
    if (!legal) throw new Error('Illegaler Zug');

    const keyBefore = repetitionKey(this.position);
    const san = moveToSan(this.position, legal, this.legalMoves());
    const undo = makeMove(this.position, legal);
    this.cachedLegalMoves = null;
    this.history.push({ undo, san, keyBefore });
    this.bumpRepetition(repetitionKey(this.position), 1);
  }

  undo(): boolean {
    const entry = this.history.pop();
    if (!entry) return false;
    this.bumpRepetition(repetitionKey(this.position), -1);
    unmakeMove(this.position, entry.undo);
    this.cachedLegalMoves = null;
    return true;
  }

  get moveCount(): number {
    return this.history.length;
  }

  get lastMove(): Move | null {
    return this.history.length ? this.history[this.history.length - 1].undo.move : null;
  }

  sanHistory(): string[] {
    return this.history.map((entry) => entry.san);
  }

  result(): GameResult {
    const count = this.repetitions.get(repetitionKey(this.position)) ?? 1;
    return gameResult(this.position, count);
  }

  fen(): string {
    return toFen(this.position);
  }

  snapshot(): Position {
    return clonePosition(this.position);
  }
}
