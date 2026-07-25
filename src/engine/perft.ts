/**
 * perft: zählt alle Zugfolgen bis zu einer bestimmten Tiefe. Der Standardtest
 * für Zuggenerierung — wenn die Zahlen für die bekannten Stellungen stimmen,
 * sind Rochade, en passant, Umwandlung und Fesselungen mit an Sicherheit
 * grenzender Wahrscheinlichkeit korrekt.
 */

import { Position, makeMove, unmakeMove } from './board';
import { generateMoves, isInCheck } from './moves';

export function perft(pos: Position, depth: number): number {
  if (depth === 0) return 1;
  const us = pos.turn;
  let nodes = 0;
  for (const m of generateMoves(pos)) {
    const undo = makeMove(pos, m);
    if (!isInCheck(pos, us)) {
      nodes += depth === 1 ? 1 : perft(pos, depth - 1);
    }
    unmakeMove(pos, undo);
  }
  return nodes;
}
