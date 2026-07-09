import * as THREE from 'three'

const SIZE = 512

/**
 * Prepare an uploaded photo for projection onto the 3D head: center-cropped to
 * a square, biased slightly towards the upper part (where the face usually is),
 * with a gentle edge feather so the projection blends into the sculpt. Edges are
 * clamped; the head shader gates sampling to the front, so no wrap-around.
 */
export async function createFaceTexture(imageUrl: string): Promise<THREE.CanvasTexture> {
  const img = await loadImage(imageUrl)
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')!

  const side = Math.min(img.width, img.height)
  const sx = (img.width - side) / 2
  // Bias the crop slightly upward so foreheads aren't cut and chins have room.
  const sy = Math.max(0, (img.height - side) / 2 - side * 0.05)
  ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE)

  // Soft rectangular feather at the very edges.
  const feather = ctx.createRadialGradient(
    SIZE / 2,
    SIZE / 2,
    SIZE * 0.35,
    SIZE / 2,
    SIZE / 2,
    SIZE * 0.62,
  )
  feather.addColorStop(0, 'rgba(0,0,0,1)')
  feather.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.globalCompositeOperation = 'destination-in'
  ctx.fillStyle = feather
  ctx.fillRect(0, 0, SIZE, SIZE)
  ctx.globalCompositeOperation = 'source-over'

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
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
