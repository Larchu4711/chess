import { describe, expect, it } from 'vitest';
import { parseFen } from '../src/engine/fen';
import { moveToSan } from '../src/engine/san';
import { LEVELS, searchBestMove } from '../src/ai/search';

function bestSan(fen: string, level: keyof typeof LEVELS): string {
  const pos = parseFen(fen);
  const result = searchBestMove(pos, LEVELS[level]);
  expect(result.move).not.toBeNull();
  return moveToSan(pos, result.move!);
}

describe('Suche', () => {
  it('findet das Matt in einem Zug', () => {
    // Grundreihenmatt: Turm nach a8.
    expect(bestSan('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', 'stark')).toBe('Ra8#');
  });

  it('schlägt eine hängende Dame', () => {
    expect(bestSan('4k3/8/8/3q4/4B3/8/8/4K3 w - - 0 1', 'mittel')).toBe('Bxd5');
  });

  it('gibt keine Figur ohne Gegenwert her', () => {
    // Der Springer auf f3 ist von g4 angegriffen und muss nicht sterben.
    const san = bestSan('rnbqkb1r/pppppppp/8/8/6n1/5N2/PPPPPPPP/RNBQKB1R w KQkq - 4 4', 'stark');
    expect(san).not.toBe('a3');
  });

  it('spielt auf mittlerer Stufe einen vernünftigen Eröffnungszug', () => {
    const san = bestSan('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', 'mittel');
    expect(['e5', 'c5', 'e6', 'c6', 'd5', 'Nf6', 'Nc6', 'd6', 'g6']).toContain(san);
  });
});
