import * as THREE from 'three'
import type { PieceType } from '../game/types'

/**
 * Procedural Staunton-style chess pieces built entirely from code — no external
 * model files. Each body is a lathed silhouette (a profile revolved around the
 * vertical axis); distinctive tops (rook crenellations, bishop mitre, knight
 * head, queen coronet, king cross) are added as small extra parts. This keeps
 * the project fully self-contained and deployable.
 *
 * Units: one board square is 1×1. Pieces are modelled to sit on the board with
 * their base at y = 0.
 */

export interface PiecePart {
  geometry: THREE.BufferGeometry
  position?: [number, number, number]
  rotation?: [number, number, number]
}

const RADIAL = 48

/** Build a lathed body from [radius, height] profile points. */
function lathe(profile: [number, number][]): THREE.BufferGeometry {
  const points = profile.map(([r, y]) => new THREE.Vector2(r, y))
  const geo = new THREE.LatheGeometry(points, RADIAL)
  geo.computeVertexNormals()
  return geo
}

// --- Body profiles (bottom to top) ---------------------------------------

const PAWN: [number, number][] = [
  [0.0, 0.0], [0.19, 0.0], [0.19, 0.035], [0.12, 0.07], [0.1, 0.16],
  [0.15, 0.2], [0.095, 0.225], [0.14, 0.27], [0.135, 0.33], [0.09, 0.4],
  [0.05, 0.43], [0.0, 0.44],
]

const ROOK: [number, number][] = [
  [0.0, 0.0], [0.22, 0.0], [0.22, 0.05], [0.15, 0.09], [0.13, 0.4],
  [0.16, 0.44], [0.2, 0.47], [0.2, 0.56], [0.14, 0.56], [0.14, 0.5], [0.0, 0.5],
]

const BISHOP: [number, number][] = [
  [0.0, 0.0], [0.21, 0.0], [0.21, 0.045], [0.13, 0.08], [0.11, 0.22],
  [0.16, 0.28], [0.1, 0.32], [0.135, 0.4], [0.11, 0.52], [0.07, 0.62],
  [0.045, 0.66], [0.0, 0.67],
]

const KNIGHT_BASE: [number, number][] = [
  [0.0, 0.0], [0.21, 0.0], [0.21, 0.045], [0.13, 0.08], [0.11, 0.22],
  [0.16, 0.27], [0.1, 0.31], [0.12, 0.38], [0.12, 0.42], [0.0, 0.42],
]

const QUEEN: [number, number][] = [
  [0.0, 0.0], [0.24, 0.0], [0.24, 0.05], [0.15, 0.1], [0.12, 0.28],
  [0.17, 0.34], [0.1, 0.38], [0.14, 0.5], [0.12, 0.66], [0.14, 0.72],
  [0.18, 0.76], [0.1, 0.78], [0.0, 0.79],
]

const KING: [number, number][] = [
  [0.0, 0.0], [0.25, 0.0], [0.25, 0.05], [0.16, 0.1], [0.13, 0.3],
  [0.18, 0.36], [0.1, 0.4], [0.15, 0.54], [0.13, 0.72], [0.16, 0.8],
  [0.19, 0.84], [0.14, 0.86], [0.14, 0.88], [0.0, 0.88],
]

// --- Decorative tops ------------------------------------------------------

function rookCrenellations(): PiecePart[] {
  const parts: PiecePart[] = []
  const box = new THREE.BoxGeometry(0.07, 0.08, 0.07)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4
    parts.push({
      geometry: box,
      position: [Math.cos(a) * 0.14, 0.6, Math.sin(a) * 0.14],
    })
  }
  return parts
}

function bishopMitre(): PiecePart[] {
  return [
    { geometry: new THREE.SphereGeometry(0.055, 24, 24), position: [0, 0.71, 0] },
  ]
}

function knightHead(): PiecePart[] {
  // A stylized horse head approximated from a few tilted blocks.
  const neck = new THREE.BoxGeometry(0.14, 0.26, 0.2)
  const head = new THREE.BoxGeometry(0.13, 0.14, 0.3)
  const snout = new THREE.BoxGeometry(0.1, 0.1, 0.14)
  const ear = new THREE.ConeGeometry(0.03, 0.09, 12)
  return [
    { geometry: neck, position: [0, 0.55, -0.02], rotation: [0.25, 0, 0] },
    { geometry: head, position: [0, 0.66, 0.08], rotation: [-0.35, 0, 0] },
    { geometry: snout, position: [0, 0.62, 0.2], rotation: [-0.15, 0, 0] },
    { geometry: ear, position: [0.04, 0.76, -0.02], rotation: [0.1, 0, 0] },
    { geometry: ear, position: [-0.04, 0.76, -0.02], rotation: [0.1, 0, 0] },
  ]
}

function queenCoronet(): PiecePart[] {
  const parts: PiecePart[] = [
    { geometry: new THREE.TorusGeometry(0.13, 0.02, 12, 32), position: [0, 0.8, 0], rotation: [Math.PI / 2, 0, 0] },
    { geometry: new THREE.SphereGeometry(0.05, 20, 20), position: [0, 0.84, 0] },
  ]
  const bead = new THREE.SphereGeometry(0.028, 12, 12)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    parts.push({ geometry: bead, position: [Math.cos(a) * 0.13, 0.82, Math.sin(a) * 0.13] })
  }
  return parts
}

function kingCross(): PiecePart[] {
  const vert = new THREE.BoxGeometry(0.04, 0.16, 0.04)
  const horiz = new THREE.BoxGeometry(0.12, 0.04, 0.04)
  return [
    { geometry: new THREE.SphereGeometry(0.045, 20, 20), position: [0, 0.9, 0] },
    { geometry: vert, position: [0, 0.99, 0] },
    { geometry: horiz, position: [0, 0.98, 0] },
  ]
}

// --- Public API -----------------------------------------------------------

const BODY: Record<PieceType, [number, number][]> = {
  p: PAWN,
  r: ROOK,
  b: BISHOP,
  n: KNIGHT_BASE,
  q: QUEEN,
  k: KING,
}

const TOPS: Record<PieceType, () => PiecePart[]> = {
  p: () => [],
  r: rookCrenellations,
  b: bishopMitre,
  n: knightHead,
  q: queenCoronet,
  k: kingCross,
}

/** Approximate overall height of a piece, used to place the portrait medallion. */
export const PIECE_HEIGHT: Record<PieceType, number> = {
  p: 0.44,
  r: 0.56,
  b: 0.71,
  n: 0.78,
  q: 0.86,
  k: 1.03,
}

const cache = new Map<PieceType, PiecePart[]>()

/** Get (memoized) the mesh parts for a piece type. Geometries are shared. */
export function getPieceParts(type: PieceType): PiecePart[] {
  const cached = cache.get(type)
  if (cached) return cached
  const parts: PiecePart[] = [{ geometry: lathe(BODY[type]) }, ...TOPS[type]()]
  cache.set(type, parts)
  return parts
}
