import type { Square } from 'chess.js'

/**
 * Board layout in world space: the board is centered on the origin, one square
 * is 1×1. White (rank 1) sits on the near side (+z, towards the camera), black
 * (rank 8) on the far side.
 */
export function squareToWorld(square: Square): [number, number] {
  const file = square.charCodeAt(0) - 97 // a..h -> 0..7
  const rank = parseInt(square[1], 10) - 1 // 1..8 -> 0..7
  const x = file - 3.5
  const z = 3.5 - rank
  return [x, z]
}

export function isLightSquare(square: Square): boolean {
  const file = square.charCodeAt(0) - 97
  const rank = parseInt(square[1], 10) - 1
  return (file + rank) % 2 === 1
}

export const ALL_SQUARES: Square[] = (() => {
  const squares: Square[] = []
  for (let r = 1; r <= 8; r++) {
    for (let f = 0; f < 8; f++) {
      squares.push((String.fromCharCode(97 + f) + r) as Square)
    }
  }
  return squares
})()
