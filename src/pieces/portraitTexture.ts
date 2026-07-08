import * as THREE from 'three'

const SIZE = 512

/**
 * Turn an uploaded photo into a circular "medallion" texture: the image is
 * center-cropped to a square, drawn into a canvas, and faded out towards the
 * edges with a radial alpha mask so it reads as a portrait mounted on the
 * piece. Runs entirely in the browser — no ML, no network.
 */
export async function createPortraitTexture(imageUrl: string): Promise<THREE.CanvasTexture> {
  const img = await loadImage(imageUrl)
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')!

  // Center-crop the source to a square and draw it filling the canvas.
  const side = Math.min(img.width, img.height)
  const sx = (img.width - side) / 2
  const sy = (img.height - side) / 2
  ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE)

  // Radial alpha mask: fully opaque in the center, transparent past the rim.
  const mask = ctx.createRadialGradient(
    SIZE / 2,
    SIZE / 2,
    SIZE * 0.2,
    SIZE / 2,
    SIZE / 2,
    SIZE * 0.5,
  )
  mask.addColorStop(0, 'rgba(0,0,0,1)')
  mask.addColorStop(0.82, 'rgba(0,0,0,1)')
  mask.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.globalCompositeOperation = 'destination-in'
  ctx.fillStyle = mask
  ctx.fillRect(0, 0, SIZE, SIZE)
  ctx.globalCompositeOperation = 'source-over'

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  texture.needsUpdate = true
  return texture
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}
