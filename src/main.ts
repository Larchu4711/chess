/**
 * Verdrahtung der Anwendung: Partie, Brett, Computergegner und Designer.
 */

import './style.css';

import { Game } from './engine/game';
import { isInCheck } from './engine/moves';
import { BISHOP, Color, KNIGHT, Move, PAWN, QUEEN, ROOK, WHITE, pieceType, sqRank } from './engine/types';
import type { SearchRequest, SearchResponse } from './ai/worker';
import { DesignSet } from './pieces/design';
import { renderAllSprites } from './pieces/render';
import { loadDesigns, saveDesigns } from './pieces/storage';
import { BoardView } from './ui/board';
import { Designer } from './ui/designer';

type Mode = 'computer' | 'human';

const PROMOTION_CHOICES = [QUEEN, ROOK, BISHOP, KNIGHT];
const PROMOTION_LABEL: Record<number, string> = {
  [QUEEN]: 'Dame',
  [ROOK]: 'Turm',
  [BISHOP]: 'Läufer',
  [KNIGHT]: 'Springer',
};

const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

class App {
  private game = new Game();
  private designs: DesignSet;
  private board: BoardView;
  private designer: Designer;
  private worker: Worker;

  private mode: Mode = 'computer';
  private level = 'mittel';
  private humanSide: Color = WHITE;
  private thinking = false;
  private searchId = 0;
  private sprites = new Map<string, string>();
  private pendingPromotion: { from: number; to: number } | null = null;

  constructor(designs: DesignSet) {
    this.designs = designs;

    this.board = new BoardView(el('board'), {
      legalMovesFrom: (square) => this.game.legalMovesFrom(square),
      canPickUp: (square) => this.canPickUp(square),
      onMove: (from, to) => this.handleMove(from, to),
    });

    this.designer = new Designer({
      getSet: () => this.designs,
      onChange: () => {
        void this.refreshSprites();
        void saveDesigns(this.designs);
      },
    });

    this.worker = new Worker(new URL('./ai/worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (event: MessageEvent<SearchResponse>) => this.onSearchResult(event.data);

    this.bindControls();
    void this.refreshSprites();
    this.render();
  }

  private bindControls(): void {
    el<HTMLButtonElement>('open-designer').addEventListener('click', () => this.designer.open());

    el<HTMLSelectElement>('mode').addEventListener('change', (event) => {
      this.mode = (event.target as HTMLSelectElement).value as Mode;
      this.updateControlVisibility();
      this.newGame();
    });

    el<HTMLSelectElement>('level').addEventListener('change', (event) => {
      this.level = (event.target as HTMLSelectElement).value;
    });

    el<HTMLSelectElement>('side').addEventListener('change', (event) => {
      this.humanSide = Number((event.target as HTMLSelectElement).value) as Color;
      this.newGame();
    });

    el<HTMLButtonElement>('new-game').addEventListener('click', () => this.newGame());
    el<HTMLButtonElement>('flip').addEventListener('click', () => {
      this.board.setOrientation(this.board.flipped ? WHITE : 1);
      this.updateStrips();
    });
    el<HTMLButtonElement>('undo').addEventListener('click', () => this.undo());

    this.updateControlVisibility();
  }

  private updateControlVisibility(): void {
    const computer = this.mode === 'computer';
    el('level-field').hidden = !computer;
    el('side-field').hidden = !computer;
  }

  private canPickUp(square: number): boolean {
    if (this.thinking || this.pendingPromotion) return false;
    if (this.game.result().over) return false;
    const piece = this.game.position.board[square];
    if (!piece) return false;
    const color = (piece >> 3) & 1;
    if (color !== this.game.turn) return false;
    if (this.mode === 'computer' && this.game.turn !== this.humanSide) return false;
    return true;
  }

  private handleMove(from: number, to: number): void {
    const piece = this.game.position.board[from];
    const promotionRank = this.game.turn === WHITE ? 7 : 0;
    if (pieceType(piece) === PAWN && sqRank(to) === promotionRank) {
      this.askPromotion(from, to);
      return;
    }
    const move = this.game.findMove(from, to);
    if (move) this.play(move);
  }

  private askPromotion(from: number, to: number): void {
    this.pendingPromotion = { from, to };
    const container = el('promotion-choices');
    container.innerHTML = '';
    const color = this.game.turn;

    for (const type of PROMOTION_CHOICES) {
      const button = document.createElement('button');
      button.className = 'promotion__choice';
      button.type = 'button';
      button.title = PROMOTION_LABEL[type];

      const img = document.createElement('img');
      img.src = this.sprites.get(`${color}${type}`) ?? '';
      img.alt = PROMOTION_LABEL[type];
      button.appendChild(img);

      button.addEventListener('click', () => {
        const pending = this.pendingPromotion;
        this.pendingPromotion = null;
        el('promotion').hidden = true;
        if (!pending) return;
        const move = this.game.findMove(pending.from, pending.to, type);
        if (move) this.play(move);
      });
      container.appendChild(button);
    }
    el('promotion').hidden = false;
  }

  private play(move: Move): void {
    this.game.play(move);
    this.render();
    this.maybeStartSearch();
  }

  private undo(): void {
    if (this.thinking) return;
    this.pendingPromotion = null;
    el('promotion').hidden = true;

    // Gegen den Computer beide Halbzüge zurücknehmen, damit der Mensch
    // wieder am Zug ist.
    this.game.undo();
    if (this.mode === 'computer' && this.game.turn !== this.humanSide) this.game.undo();
    this.board.clearSelection();
    this.render();
  }

  private newGame(): void {
    this.searchId++;
    this.thinking = false;
    this.pendingPromotion = null;
    el('promotion').hidden = true;
    this.game = new Game();
    this.board.clearSelection();
    if (this.mode === 'computer') this.board.setOrientation(this.humanSide);
    this.render();
    this.maybeStartSearch();
  }

  private maybeStartSearch(): void {
    if (this.mode !== 'computer') return;
    if (this.game.result().over) return;
    if (this.game.turn === this.humanSide) return;

    this.thinking = true;
    this.updateStatus();
    const request: SearchRequest = {
      id: ++this.searchId,
      fen: this.game.fen(),
      level: this.level,
    };
    this.worker.postMessage(request);
  }

  private onSearchResult(result: SearchResponse): void {
    if (result.id !== this.searchId) return; // Antwort auf eine verworfene Suche.
    this.thinking = false;
    if (result.from < 0) {
      this.render();
      return;
    }
    const move = this.game.findMove(result.from, result.to, result.promotion);
    if (move) {
      this.game.play(move);
    }
    this.render();
  }

  private async refreshSprites(): Promise<void> {
    this.sprites = await renderAllSprites(this.designs);
    this.board.setSprites(this.sprites);
    this.updateStrips();
  }

  private render(): void {
    const check = isInCheck(this.game.position) ? this.game.position.kings[this.game.turn] : null;
    this.board.setPosition(this.game.position, this.game.lastMove, check);
    this.updateStatus();
    this.updateMoveList();
    this.updateStrips();
  }

  private playerName(color: Color): string {
    const name = this.designs.players[color].name.trim();
    if (name) return name;
    return color === WHITE ? 'Weiß' : 'Schwarz';
  }

  private updateStrips(): void {
    const topColor: Color = this.board.flipped ? WHITE : 1;
    const bottomColor: Color = this.board.flipped ? 1 : WHITE;
    const strip = (id: string, color: Color) => {
      const node = el(id).querySelector('.player-strip__name') as HTMLElement;
      node.textContent = this.playerName(color);
      const note = el(id).querySelector('.player-strip__note') as HTMLElement;
      const isComputer = this.mode === 'computer' && color !== this.humanSide;
      note.textContent = isComputer ? 'Computer' : '';
    };
    strip('strip-top', topColor);
    strip('strip-bottom', bottomColor);
  }

  private updateStatus(): void {
    const status = el('status');
    const result = this.game.result();

    if (result.over) {
      switch (result.kind) {
        case 'checkmate':
          status.textContent = `Schachmatt — ${this.playerName(result.winner)} gewinnt`;
          break;
        case 'stalemate':
          status.textContent = 'Patt — remis';
          break;
        case 'fifty-move':
          status.textContent = 'Remis nach der 50-Züge-Regel';
          break;
        case 'repetition':
          status.textContent = 'Remis durch dreifache Stellungswiederholung';
          break;
        case 'insufficient-material':
          status.textContent = 'Remis — nicht genug Material zum Mattsetzen';
          break;
      }
      status.dataset.state = 'over';
      return;
    }

    if (this.thinking) {
      status.textContent = `${this.playerName(this.game.turn)} denkt nach …`;
      status.dataset.state = 'thinking';
      return;
    }

    const check = isInCheck(this.game.position) ? ' — Schach!' : '';
    status.textContent = `${this.playerName(this.game.turn)} ist am Zug${check}`;
    status.dataset.state = check ? 'check' : 'normal';
  }

  private updateMoveList(): void {
    const list = el('moves');
    const history = this.game.sanHistory();
    list.innerHTML = '';
    for (let i = 0; i < history.length; i += 2) {
      const item = document.createElement('li');
      const white = document.createElement('span');
      white.textContent = history[i];
      item.appendChild(white);
      if (history[i + 1]) {
        const black = document.createElement('span');
        black.textContent = history[i + 1];
        item.appendChild(black);
      }
      list.appendChild(item);
    }
    list.scrollTop = list.scrollHeight;
  }
}

async function boot(): Promise<void> {
  const designs = await loadDesigns();
  new App(designs);
}

void boot();
