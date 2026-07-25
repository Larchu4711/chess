import { describe, expect, it } from 'vitest';
import { parseFen, START_FEN } from '../src/engine/fen';
import { perft } from '../src/engine/perft';

/**
 * Die Knotenzahlen sind die allgemein bekannten Referenzwerte der
 * Chess-Programming-Wiki-Testpositionen. Sie decken Rochade, en passant,
 * Umwandlung, Fesselungen und Schachabwehr ab.
 */
const CASES: { name: string; fen: string; expected: number[] }[] = [
  {
    name: 'Grundstellung',
    fen: START_FEN,
    expected: [20, 400, 8902, 197281],
  },
  {
    name: 'Kiwipete',
    fen: 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
    expected: [48, 2039, 97862],
  },
  {
    name: 'En-passant-Stellung',
    fen: '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1',
    expected: [14, 191, 2812, 43238],
  },
  {
    name: 'Umwandlungen',
    fen: 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1',
    expected: [6, 264, 9467],
  },
  {
    name: 'Position 5',
    fen: 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8',
    expected: [44, 1486, 62379],
  },
  {
    name: 'Position 6',
    fen: 'r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10',
    expected: [46, 2079, 89890],
  },
];

describe('perft', () => {
  for (const testCase of CASES) {
    it(testCase.name, () => {
      const pos = parseFen(testCase.fen);
      testCase.expected.forEach((nodes, index) => {
        expect(perft(pos, index + 1), `Tiefe ${index + 1}`).toBe(nodes);
      });
    });
  }
});
