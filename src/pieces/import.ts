/**
 * Bilder einlesen: verkleinern, komprimieren und — wenn der Browser es
 * anbietet — das Gesicht automatisch mittig in den Kopfkreis rücken.
 */

import { FaceTransform, defaultTransform } from './design';
import { loadImage } from './render';

/** Längere Kante nach dem Verkleinern. Genug für 256px-Sprites mit Reserve. */
const MAX_EDGE = 640;

export async function fileToDataUrl(file: File): Promise<string> {
  const raw = await readAsDataUrl(file);
  const image = await loadImage(raw);
  return downscale(image);
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Datei konnte nicht gelesen werden'));
    reader.readAsDataURL(file);
  });
}

function downscale(image: HTMLImageElement): string {
  const w = image.naturalWidth || image.width;
  const h = image.naturalHeight || image.height;
  const factor = Math.min(1, MAX_EDGE / Math.max(w, h));
  const width = Math.max(1, Math.round(w * factor));
  const height = Math.max(1, Math.round(h * factor));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return image.src;
  ctx.drawImage(image, 0, 0, width, height);

  // Freigestellte Bilder brauchen PNG, Fotos sind als JPEG deutlich kleiner.
  return isOpaque(ctx, width, height)
    ? canvas.toDataURL('image/jpeg', 0.88)
    : canvas.toDataURL('image/png');
}

function isOpaque(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  try {
    const data = ctx.getImageData(0, 0, width, height).data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) return false;
    }
    return true;
  } catch {
    return false;
  }
}

interface DetectedFace {
  boundingBox: { x: number; y: number; width: number; height: number };
}

/**
 * Versucht, das Gesicht zu finden und so auszurichten, dass es den Kopfkreis
 * gut ausfüllt. Die FaceDetector-API gibt es nicht in jedem Browser — ohne sie
 * bleibt es bei der neutralen Ausrichtung, die man von Hand nachjustiert.
 */
export async function autoFaceTransform(dataUrl: string): Promise<FaceTransform> {
  const fallback = defaultTransform();
  const detectorFactory = (globalThis as Record<string, unknown>).FaceDetector as
    | (new (options?: unknown) => { detect(source: CanvasImageSource): Promise<DetectedFace[]> })
    | undefined;
  if (!detectorFactory) return fallback;

  try {
    const image = await loadImage(dataUrl);
    const detector = new detectorFactory({ fastMode: true, maxDetectedFaces: 1 });
    const faces = await detector.detect(image);
    if (!faces.length) return fallback;

    const box = faces[0].boundingBox;
    const imageWidth = image.naturalWidth || image.width;
    const imageHeight = image.naturalHeight || image.height;

    // Der Kopfkreis hat im Zeichenraster den Radius R; das Gesicht soll rund
    // 80 % seines Durchmessers einnehmen. Die Rechnung ist unabhängig von R,
    // weil die Verschiebung ebenfalls in Vielfachen von R angegeben wird.
    const R = 1;
    const targetScale = (2 * R * 0.8) / Math.max(box.width, box.height);
    const cover = Math.max((2 * R) / imageWidth, (2 * R) / imageHeight);

    const faceCenterX = box.x + box.width / 2;
    const faceCenterY = box.y + box.height / 2;

    return {
      scale: targetScale / cover,
      dx: (targetScale * (imageWidth / 2 - faceCenterX)) / R,
      dy: (targetScale * (imageHeight / 2 - faceCenterY)) / R + 0.05,
      rotate: 0,
    };
  } catch {
    return fallback;
  }
}
