/**
 * Optional face cutout (background removal) — reserved for a later iteration.
 *
 * In the MVP the portrait medallion uses a radial alpha mask (see
 * portraitTexture.ts), which is robust and fully offline. A future version can
 * replace this stub with client-side segmentation (e.g. MediaPipe Selfie
 * Segmentation) to isolate the person before masking.
 */
export const FACE_CUTOUT_ENABLED = false

export async function cutoutFace(image: Blob): Promise<Blob> {
  // Placeholder: return the image unchanged until segmentation is wired in.
  return image
}
