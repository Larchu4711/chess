import { create } from 'zustand'
import type { Square } from 'chess.js'
import { ChessEngine } from '../game/chessEngine'
import { ChessAI } from '../game/ai'
import type { BoardPiece, Color, Difficulty, SkinKey } from '../game/types'

/** Data for one customized piece skin. */
export interface SkinData {
  /** Object URL or data URL of the (possibly stylized) portrait image. */
  imageUrl: string
  /** True when the image was produced by AI stylization. */
  ai: boolean
}

export type GameStatus =
  | { kind: 'playing'; check: boolean }
  | { kind: 'checkmate'; winner: Color }
  | { kind: 'stalemate' }
  | { kind: 'draw' }

// Engine + AI live outside React state (they are mutable singletons; we mirror
// the parts the UI needs — fen, pieces, targets — into the store on each move).
const engine = new ChessEngine()
const ai = new ChessAI()

/** The human always plays white in the MVP. */
export const PLAYER_COLOR: Color = 'w'

interface GameState {
  fen: string
  pieces: BoardPiece[]
  turn: Color
  selected: Square | null
  legalTargets: Square[]
  lastMove: { from: Square; to: Square } | null
  history: string[]
  status: GameStatus
  difficulty: Difficulty
  thinking: boolean
  skins: Partial<Record<SkinKey, SkinData>>

  selectSquare: (square: Square) => void
  clearSelection: () => void
  newGame: () => void
  undoMove: () => void
  setDifficulty: (d: Difficulty) => void
  setSkin: (key: SkinKey, data: SkinData) => void
  clearSkin: (key: SkinKey) => void
}

function computeStatus(): GameStatus {
  if (engine.isCheckmate()) {
    // The side to move has been mated, so the other side won.
    return { kind: 'checkmate', winner: engine.turn() === 'w' ? 'b' : 'w' }
  }
  if (engine.isStalemate()) return { kind: 'stalemate' }
  if (engine.isDraw()) return { kind: 'draw' }
  return { kind: 'playing', check: engine.isCheck() }
}

function snapshot(): Pick<GameState, 'fen' | 'pieces' | 'turn' | 'history' | 'status' | 'lastMove'> {
  return {
    fen: engine.fen(),
    pieces: engine.pieces(),
    turn: engine.turn(),
    history: engine.history(),
    status: computeStatus(),
    lastMove: null,
  }
}

export const useGameStore = create<GameState>((set, get) => {
  /** Ask the AI for a move and apply it, unless the game ended meanwhile. */
  async function playAiMove() {
    const state = get()
    if (state.status.kind !== 'playing' || engine.turn() === PLAYER_COLOR) return
    set({ thinking: true })
    const fenAtRequest = engine.fen()
    const best = await ai.bestMove(fenAtRequest, get().difficulty)
    // Ignore a stale reply (e.g. the board was reset while thinking).
    if (!best || engine.fen() !== fenAtRequest) {
      set({ thinking: false })
      return
    }
    engine.move(best.from, best.to)
    set({
      ...snapshot(),
      lastMove: { from: best.from, to: best.to },
      thinking: false,
      selected: null,
      legalTargets: [],
    })
  }

  function applyPlayerMove(from: Square, to: Square) {
    const san = engine.move(from, to)
    if (!san) return false
    set({
      ...snapshot(),
      lastMove: { from, to },
      selected: null,
      legalTargets: [],
    })
    void playAiMove()
    return true
  }

  return {
    ...snapshot(),
    selected: null,
    legalTargets: [],
    difficulty: 2,
    thinking: false,
    skins: {},

    selectSquare(square) {
      const { thinking, selected, legalTargets } = get()
      if (thinking || engine.turn() !== PLAYER_COLOR) return

      // Clicking a highlighted target executes the move.
      if (selected && legalTargets.includes(square)) {
        applyPlayerMove(selected, square)
        return
      }

      // Otherwise (re)select one of the player's own pieces.
      const piece = engine.pieces().find((p) => p.square === square)
      if (piece && piece.color === PLAYER_COLOR) {
        set({ selected: square, legalTargets: engine.legalTargets(square) })
      } else {
        set({ selected: null, legalTargets: [] })
      }
    },

    clearSelection() {
      set({ selected: null, legalTargets: [] })
    },

    newGame() {
      ai.cancelAll()
      engine.reset()
      set({
        ...snapshot(),
        selected: null,
        legalTargets: [],
        thinking: false,
      })
    },

    undoMove() {
      const { thinking } = get()
      if (thinking) return
      // Undo the AI reply and the player's move so it's the player's turn again.
      engine.undo()
      if (engine.turn() !== PLAYER_COLOR) engine.undo()
      set({
        ...snapshot(),
        selected: null,
        legalTargets: [],
      })
    },

    setDifficulty(d) {
      set({ difficulty: d })
    },

    setSkin(key, data) {
      set((s) => ({ skins: { ...s.skins, [key]: data } }))
    },

    clearSkin(key) {
      set((s) => {
        const next = { ...s.skins }
        const existing = next[key]
        if (existing) URL.revokeObjectURL(existing.imageUrl)
        delete next[key]
        return { skins: next }
      })
    },
  }
})
