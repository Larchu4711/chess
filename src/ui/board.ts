/**
 * Brettdarstellung und Eingabe.
 *
 * Figuren liegen in einer eigenen, absolut positionierten Ebene über den
 * Feldern. Dadurch lassen sie sich weich verschieben und beim Ziehen aus dem
 * Raster lösen, ohne die Feldstruktur anzufassen.
 */

import { Position } from '../engine/board';
import {
  Color,
  EMPTY,
  Move,
  SQUARES,
  pieceColor,
  pieceType,
  sqFile,
  sqRank,
  squareName,
} from '../engine/types';

export interface BoardCallbacks {
  /** Liefert die legalen Züge, die von diesem Feld ausgehen. */
  legalMovesFrom(square: number): Move[];
  /** Darf der Nutzer die Figur auf diesem Feld gerade anfassen? */
  canPickUp(square: number): boolean;
  /** Ein Zug wurde ausgelöst. */
  onMove(from: number, to: number): void;
}

const DRAG_THRESHOLD = 4;

export class BoardView {
  private squaresEl: HTMLElement;
  private piecesEl: HTMLElement;
  private squareEls: HTMLElement[] = [];
  private pieceEls = new Map<number, HTMLImageElement>();
  private sprites = new Map<string, string>();

  private orientation: Color = 0;
  private selected: number | null = null;
  private targets = new Set<number>();
  private lastMove: Move | null = null;
  private checkSquare: number | null = null;
  private position: Position | null = null;

  private drag: {
    from: number;
    el: HTMLImageElement;
    pointerId: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly callbacks: BoardCallbacks,
  ) {
    this.squaresEl = root.querySelector('#squares') as HTMLElement;
    this.piecesEl = root.querySelector('#pieces') as HTMLElement;
    this.buildSquares();
    this.attachInput();
  }

  private buildSquares(): void {
    this.squaresEl.innerHTML = '';
    this.squareEls = [];
    for (let index = 0; index < 64; index++) {
      const el = document.createElement('div');
      el.className = 'square';
      this.squaresEl.appendChild(el);
      this.squareEls.push(el);
    }
    this.paintSquares();
  }

  /** Bildschirmposition (Spalte/Zeile) eines Feldes unter aktueller Drehung. */
  private layoutOf(square: number): { col: number; row: number } {
    const file = sqFile(square);
    const rank = sqRank(square);
    return this.orientation === 0
      ? { col: file, row: 7 - rank }
      : { col: 7 - file, row: rank };
  }

  private squareAt(col: number, row: number): number {
    return this.orientation === 0 ? (7 - row) * 16 + col : row * 16 + (7 - col);
  }

  private paintSquares(): void {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const el = this.squareEls[row * 8 + col];
        const square = this.squareAt(col, row);
        const light = (sqFile(square) + sqRank(square)) % 2 === 1;
        el.className = `square ${light ? 'square--light' : 'square--dark'}`;
        el.dataset.square = String(square);
        el.textContent = '';

        // Koordinaten nur am Rand, damit das Brett ruhig bleibt.
        if (col === 0) {
          const label = document.createElement('span');
          label.className = 'square__rank';
          label.textContent = String(sqRank(square) + 1);
          el.appendChild(label);
        }
        if (row === 7) {
          const label = document.createElement('span');
          label.className = 'square__file';
          label.textContent = squareName(square)[0];
          el.appendChild(label);
        }
      }
    }
  }

  setOrientation(color: Color): void {
    this.orientation = color;
    this.paintSquares();
    this.refreshHighlights();
    if (this.position) this.setPosition(this.position, this.lastMove, this.checkSquare);
  }

  get flipped(): boolean {
    return this.orientation === 1;
  }

  setSprites(sprites: Map<string, string>): void {
    this.sprites = sprites;
    for (const [square, el] of this.pieceEls) {
      const piece = this.position?.board[square];
      if (piece) el.src = this.spriteFor(piece);
    }
  }

  private spriteFor(piece: number): string {
    return this.sprites.get(`${pieceColor(piece)}${pieceType(piece)}`) ?? '';
  }

  setPosition(position: Position, lastMove: Move | null, checkSquare: number | null): void {
    this.position = position;
    this.lastMove = lastMove;
    this.checkSquare = checkSquare;

    const seen = new Set<number>();
    for (const square of SQUARES) {
      const piece = position.board[square];
      if (piece === EMPTY) continue;
      seen.add(square);

      let el = this.pieceEls.get(square);
      if (!el) {
        el = document.createElement('img');
        el.className = 'piece';
        el.draggable = false;
        this.piecesEl.appendChild(el);
        this.pieceEls.set(square, el);
      }
      const src = this.spriteFor(piece);
      if (el.src !== src && src) el.src = src;
      el.dataset.square = String(square);
      el.dataset.piece = String(piece);
      this.placePiece(el, square);
    }

    for (const [square, el] of [...this.pieceEls]) {
      if (!seen.has(square)) {
        el.remove();
        this.pieceEls.delete(square);
      }
    }

    this.refreshHighlights();
  }

  private placePiece(el: HTMLImageElement, square: number): void {
    const { col, row } = this.layoutOf(square);
    el.style.left = `${col * 12.5}%`;
    el.style.top = `${row * 12.5}%`;
    el.style.transform = '';
  }

  clearSelection(): void {
    this.selected = null;
    this.targets.clear();
    this.refreshHighlights();
  }

  private select(square: number): void {
    const moves = this.callbacks.legalMovesFrom(square);
    if (moves.length === 0) {
      this.clearSelection();
      return;
    }
    this.selected = square;
    this.targets = new Set(moves.map((m) => m.to));
    this.refreshHighlights();
  }

  private refreshHighlights(): void {
    for (const el of this.squareEls) {
      const square = Number(el.dataset.square);
      el.classList.toggle('square--selected', this.selected === square);
      el.classList.toggle('square--check', this.checkSquare === square);
      el.classList.toggle(
        'square--last',
        this.lastMove !== null && (this.lastMove.from === square || this.lastMove.to === square),
      );

      const isTarget = this.targets.has(square);
      const occupied = this.position ? this.position.board[square] !== EMPTY : false;
      el.classList.toggle('square--target', isTarget && !occupied);
      el.classList.toggle('square--capture', isTarget && occupied);
    }
  }

  private squareFromEvent(event: PointerEvent): number | null {
    const rect = this.root.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
    const col = Math.min(7, Math.max(0, Math.floor((x / rect.width) * 8)));
    const row = Math.min(7, Math.max(0, Math.floor((y / rect.height) * 8)));
    return this.squareAt(col, row);
  }

  private attachInput(): void {
    this.root.addEventListener('pointerdown', (event) => this.onPointerDown(event));
    window.addEventListener('pointermove', (event) => this.onPointerMove(event));
    window.addEventListener('pointerup', (event) => this.onPointerUp(event));
    window.addEventListener('pointercancel', () => this.cancelDrag());
  }

  private onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    const square = this.squareFromEvent(event);
    if (square === null) return;

    // Ein bereits gewähltes Zielfeld anzuklicken führt den Zug aus.
    if (this.selected !== null && this.targets.has(square)) {
      const from = this.selected;
      this.clearSelection();
      this.callbacks.onMove(from, square);
      return;
    }

    const el = this.pieceEls.get(square);
    if (!el || !this.callbacks.canPickUp(square)) {
      this.clearSelection();
      return;
    }

    event.preventDefault();
    this.select(square);
    this.drag = {
      from: square,
      el,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
  }

  private onPointerMove(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;

    if (!drag.moved) {
      drag.moved = true;
      drag.el.classList.add('piece--dragging');
    }
    drag.el.style.transform = `translate(${dx}px, ${dy}px) scale(1.08)`;
  }

  private onPointerUp(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    this.drag = null;
    drag.el.classList.remove('piece--dragging');
    drag.el.style.transform = '';

    if (!drag.moved) return; // Reiner Klick: Auswahl bleibt bestehen.

    const target = this.squareFromEvent(event);
    if (target === null || target === drag.from || !this.targets.has(target)) {
      this.placePiece(drag.el, drag.from);
      return;
    }
    this.clearSelection();
    this.callbacks.onMove(drag.from, target);
  }

  private cancelDrag(): void {
    if (!this.drag) return;
    this.drag.el.classList.remove('piece--dragging');
    this.drag.el.style.transform = '';
    this.placePiece(this.drag.el, this.drag.from);
    this.drag = null;
  }
}
