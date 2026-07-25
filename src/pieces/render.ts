/**
 * Erzeugt aus einer Gestaltung fertige Figuren-Bilder (Data-URLs), die das
 * Brett direkt als `<img>` anzeigen kann. Ergebnisse werden zwischengespeichert,
 * damit ein Zug nicht zwölf Figuren neu zeichnet.
 */

import { Color, PieceType, WHITE } from '../engine/types';
import { DesignSet, PIECE_TYPES, PieceDesign, designKey } from './design';
import { FaceSource, drawPiece } from './draw';

const SPRITE_SIZE = 256;

const imageCache = new Map<string, Promise<HTMLImageElement>>();
const spriteCache = new Map<string, string>();

export function loadImage(src: string): Promise<HTMLImageElement> {
  let pending = imageCache.get(src);
  if (!pending) {
    pending = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Bild konnte nicht geladen werden'));
      img.src = src;
    });
    imageCache.set(src, pending);
  }
  return pending;
}

async function faceSourceFor(set: DesignSet, design: PieceDesign): Promise<FaceSource | null> {
  if (!design.imageId) return null;
  const src = set.images[design.imageId];
  if (!src) return null;
  try {
    const image = await loadImage(src);
    return {
      image,
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
      transform: design.transform,
    };
  } catch {
    return null;
  }
}

/** Zeichnet eine einzelne Figur formatfüllend in ein bestehendes Canvas. */
export async function paintPiece(
  canvas: HTMLCanvasElement,
  set: DesignSet,
  color: Color,
  type: PieceType,
): Promise<void> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const face = await faceSourceFor(set, set.players[color].pieces[type]);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(canvas.width / 100, canvas.height / 100);
  drawPiece(ctx, type, color, face);
  ctx.restore();
}

export function spriteKeyFor(set: DesignSet, color: Color, type: PieceType): string {
  return `${color}-${type}-${designKey(set.players[color].pieces[type])}`;
}

async function renderSprite(set: DesignSet, color: Color, type: PieceType): Promise<string> {
  const key = spriteKeyFor(set, color, type);
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_SIZE;
  canvas.height = SPRITE_SIZE;
  await paintPiece(canvas, set, color, type);
  const url = canvas.toDataURL('image/png');
  spriteCache.set(key, url);
  return url;
}

/** Alle zwölf Figuren als Map `"farbeTyp" → Data-URL`. */
export async function renderAllSprites(set: DesignSet): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const jobs: Promise<void>[] = [];
  for (const color of [WHITE, 1] as Color[]) {
    for (const type of PIECE_TYPES) {
      jobs.push(
        renderSprite(set, color, type).then((url) => {
          out.set(`${color}${type}`, url);
        }),
      );
    }
  }
  await Promise.all(jobs);
  return out;
}
