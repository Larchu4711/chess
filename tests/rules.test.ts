import { describe, expect, it } from 'vitest';
import { Game } from '../src/engine/game';
import { parseFen, toFen, START_FEN } from '../src/engine/fen';
import { gameResult, hasInsufficientMaterial } from '../src/engine/rules';
import { generateLegalMoves } from '../src/engine/moves';
import { QUEEN, parseSquare, squareName } from '../src/engine/types';

describe('FEN', () => {
  it('liest und schreibt die Grundstellung verlustfrei', () => {
    expect(toFen(parseFen(START_FEN))).toBe(START_FEN);
  });

  it('behält Rochaderechte und en-passant-Feld', () => {
    const fen = 'r3k2r/8/8/3pP3/8/8/8/R3K2R w KQkq d6 0 12';
    expect(toFen(parseFen(fen))).toBe(fen);
  });
});

describe('Partieende', () => {
  it('erkennt das Narrenmatt', () => {
    // Züge über Koordinaten spielen, damit der Test nicht von SAN abhängt.
    const moves: [string, string][] = [
      ['f2', 'f3'],
      ['e7', 'e5'],
      ['g2', 'g4'],
      ['d8', 'h4'],
    ];
    const g = new Game();
    for (const [from, to] of moves) {
      const m = g.findMove(parseSquare(from), parseSquare(to));
      expect(m, `${from}${to}`).not.toBeNull();
      g.play(m!);
    }
    const result = g.result();
    expect(result.over).toBe(true);
    expect(result.over && result.kind).toBe('checkmate');
    expect(g.sanHistory()).toEqual(['f3', 'e5', 'g4', 'Qh4#']);
  });

  it('erkennt Patt', () => {
    const pos = parseFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
    const result = gameResult(pos);
    expect(result.over && result.kind).toBe('stalemate');
  });

  it('erkennt Materialmangel', () => {
    expect(hasInsufficientMaterial(parseFen('8/8/4k3/8/8/4K3/8/8 w - - 0 1'))).toBe(true);
    expect(hasInsufficientMaterial(parseFen('8/8/4k3/8/8/4K1N1/8/8 w - - 0 1'))).toBe(true);
    expect(hasInsufficientMaterial(parseFen('8/8/4k3/8/8/4K1R1/8/8 w - - 0 1'))).toBe(false);
  });

  it('erkennt dreifache Stellungswiederholung', () => {
    const g = new Game();
    const shuffle: [string, string][] = [
      ['g1', 'f3'],
      ['g8', 'f6'],
      ['f3', 'g1'],
      ['f6', 'g8'],
      ['g1', 'f3'],
      ['g8', 'f6'],
      ['f3', 'g1'],
      ['f6', 'g8'],
    ];
    for (const [from, to] of shuffle) {
      g.play(g.findMove(parseSquare(from), parseSquare(to))!);
    }
    const result = g.result();
    expect(result.over && result.kind).toBe('repetition');
  });
});

describe('Sonderzüge', () => {
  it('führt die kurze Rochade samt Turm aus', () => {
    const g = new Game('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    g.play(g.findMove(parseSquare('e1'), parseSquare('g1'))!);
    expect(toFen(g.position).startsWith('r3k2r/8/8/8/8/8/8/R4RK1')).toBe(true);
    expect(g.sanHistory()).toEqual(['O-O']);
  });

  it('verbietet Rochade durch ein bedrohtes Feld', () => {
    const pos = parseFen('4k3/8/8/8/8/8/6q1/R3K2R w KQ - 0 1');
    const castles = generateLegalMoves(pos).filter(
      (m) => squareName(m.from) === 'e1' && (squareName(m.to) === 'g1' || squareName(m.to) === 'c1'),
    );
    expect(castles.map((m) => squareName(m.to))).toEqual(['c1']);
  });

  it('schlägt en passant und entfernt den richtigen Bauern', () => {
    const g = new Game('4k3/8/8/8/4p3/8/3P4/4K3 w - - 0 1');
    g.play(g.findMove(parseSquare('d2'), parseSquare('d4'))!);
    const ep = g.findMove(parseSquare('e4'), parseSquare('d3'));
    expect(ep).not.toBeNull();
    g.play(ep!);
    expect(toFen(g.position).split(' ')[0]).toBe('4k3/8/8/8/8/3p4/8/4K3');
  });

  it('wandelt einen Bauern in die gewählte Figur um', () => {
    const g = new Game('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
    const promo = g.findMove(parseSquare('a7'), parseSquare('a8'), QUEEN);
    expect(promo).not.toBeNull();
    g.play(promo!);
    // Die neue Dame auf a8 gibt dem König auf e8 sofort Schach.
    expect(g.sanHistory()[0]).toBe('a8=Q+');
  });
});

describe('Zurücknehmen', () => {
  it('stellt die Ausgangsstellung exakt wieder her', () => {
    const g = new Game();
    const before = g.fen();
    g.play(g.findMove(parseSquare('e2'), parseSquare('e4'))!);
    g.play(g.findMove(parseSquare('c7'), parseSquare('c5'))!);
    g.undo();
    g.undo();
    expect(g.fen()).toBe(before);
    expect(g.moveCount).toBe(0);
  });
});
