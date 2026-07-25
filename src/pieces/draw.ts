/**
 * Zeichnet die Figuren.
 *
 * Jede Figur besteht aus demselben Aufbau: Sockel, Körper, Kragen, ein
 * kreisrunder Kopfbereich und darüber die typbestimmende Kopfbedeckung —
 * Krone, Tiara, Mitra, Zinnen, Helm oder nichts. In den Kopfkreis wird das
 * Foto des Spielers eingesetzt, beschnitten und ausgerichtet. So bleibt die
 * Figur auf einen Blick als König, Dame oder Bauer erkennbar und trägt
 * trotzdem das Gesicht der Person.
 *
 * Gezeichnet wird in einem gedachten 100x100-Raster; der Aufrufer skaliert.
 */

import { BISHOP, Color, KING, KNIGHT, PAWN, PieceType, QUEEN, ROOK } from '../engine/types';
import { FaceTransform } from './design';

export interface Palette {
  body: string;
  bodyShade: string;
  line: string;
  head: string;
  accent: string;
}

export const PALETTES: Record<Color, Palette> = {
  0: {
    body: '#f6f1e6',
    bodyShade: '#ddd3c0',
    line: '#3b332a',
    head: '#e6dccb',
    accent: '#c9a227',
  },
  1: {
    body: '#3a3633',
    bodyShade: '#26231f',
    line: '#0d0c0b',
    head: '#4e4945',
    accent: '#d8b24a',
  },
};

interface Geometry {
  /** Mittelpunkt und Radius des Kopfkreises. */
  headY: number;
  headR: number;
  collarY: number;
  collarHalf: number;
  waistY: number;
  waistHalf: number;
  plinthHalf: number;
  baseHalf: number;
}

/**
 * Der Kopf sitzt bewusst so tief, dass oberhalb davon noch rund 24 Einheiten
 * für die höchste Kopfbedeckung bleiben — das Kreuz des Königs braucht sie.
 */
const MAJOR: Geometry = {
  headY: 39,
  headR: 15,
  collarY: 55,
  collarHalf: 15,
  waistY: 62,
  waistHalf: 9,
  plinthHalf: 23,
  baseHalf: 30,
};

const PAWN_GEOMETRY: Geometry = {
  headY: 43,
  headR: 13,
  collarY: 57,
  collarHalf: 12,
  waistY: 63,
  waistHalf: 8,
  plinthHalf: 20,
  baseHalf: 26,
};

function geometryFor(type: PieceType): Geometry {
  return type === PAWN ? PAWN_GEOMETRY : MAJOR;
}

export interface FaceSource {
  image: CanvasImageSource;
  width: number;
  height: number;
  transform: FaceTransform;
}

/**
 * Zeichnet eine Figur in das aktuelle Koordinatensystem, das bereits so
 * skaliert sein muss, dass 100 Einheiten der Figurenhöhe entsprechen.
 */
export function drawPiece(
  ctx: CanvasRenderingContext2D,
  type: PieceType,
  color: Color,
  face: FaceSource | null,
): void {
  const palette = PALETTES[color];
  const geo = geometryFor(type);

  drawShadow(ctx, geo);
  drawBody(ctx, geo, palette);
  drawHead(ctx, geo, palette, face);
  drawHeadpiece(ctx, type, geo, palette);
}

function drawShadow(ctx: CanvasRenderingContext2D, geo: Geometry): void {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.beginPath();
  ctx.ellipse(50, 92, geo.baseHalf, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBody(ctx: CanvasRenderingContext2D, geo: Geometry, palette: Palette): void {
  const { baseHalf, plinthHalf, waistHalf, waistY, collarHalf, collarY } = geo;

  ctx.save();
  ctx.lineWidth = 2.2;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = palette.line;

  // Sockel
  ctx.beginPath();
  ctx.moveTo(50 - baseHalf, 91);
  ctx.lineTo(50 - baseHalf, 85);
  ctx.quadraticCurveTo(50 - baseHalf, 81, 50 - plinthHalf, 80);
  ctx.lineTo(50 + plinthHalf, 80);
  ctx.quadraticCurveTo(50 + baseHalf, 81, 50 + baseHalf, 85);
  ctx.lineTo(50 + baseHalf, 91);
  ctx.closePath();
  ctx.fillStyle = palette.bodyShade;
  ctx.fill();
  ctx.stroke();

  // Körper: vom Sockel geschwungen zur Taille und wieder zum Kragen hin auf.
  ctx.beginPath();
  ctx.moveTo(50 - plinthHalf, 80);
  ctx.bezierCurveTo(
    50 - plinthHalf + 3, 72,
    50 - waistHalf - 4, 70,
    50 - waistHalf, waistY,
  );
  ctx.lineTo(50 - collarHalf, collarY);
  ctx.lineTo(50 + collarHalf, collarY);
  ctx.lineTo(50 + waistHalf, waistY);
  ctx.bezierCurveTo(
    50 + waistHalf + 4, 70,
    50 + plinthHalf - 3, 72,
    50 + plinthHalf, 80,
  );
  ctx.closePath();
  ctx.fillStyle = palette.body;
  ctx.fill();
  ctx.stroke();

  // Kragen
  ctx.beginPath();
  ctx.ellipse(50, collarY, collarHalf, 4.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = palette.bodyShade;
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawHead(
  ctx: CanvasRenderingContext2D,
  geo: Geometry,
  palette: Palette,
  face: FaceSource | null,
): void {
  const { headY, headR } = geo;

  ctx.save();
  ctx.beginPath();
  ctx.arc(50, headY, headR, 0, Math.PI * 2);
  ctx.fillStyle = palette.head;
  ctx.fill();

  if (face) {
    ctx.save();
    ctx.clip();
    const t = face.transform;
    // "cover": das Bild füllt den Kopfkreis bei scale = 1 vollständig aus.
    const cover = Math.max((2 * headR) / face.width, (2 * headR) / face.height);
    const s = cover * t.scale;
    ctx.translate(50 + t.dx * headR, headY + t.dy * headR);
    ctx.rotate(t.rotate);
    ctx.drawImage(
      face.image,
      (-face.width * s) / 2,
      (-face.height * s) / 2,
      face.width * s,
      face.height * s,
    );
    ctx.restore();
  } else {
    // Ohne Foto bleibt der Kopf bewusst leer — das macht sichtbar, dass hier
    // noch ein Gesicht hingehört.
    ctx.save();
    ctx.clip();
    const gradient = ctx.createLinearGradient(50 - headR, headY - headR, 50 + headR, headY + headR);
    gradient.addColorStop(0, palette.head);
    gradient.addColorStop(1, palette.bodyShade);
    ctx.fillStyle = gradient;
    ctx.fillRect(50 - headR, headY - headR, headR * 2, headR * 2);
    ctx.restore();
  }

  ctx.lineWidth = 2.4;
  ctx.strokeStyle = palette.line;
  ctx.beginPath();
  ctx.arc(50, headY, headR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawHeadpiece(
  ctx: CanvasRenderingContext2D,
  type: PieceType,
  geo: Geometry,
  palette: Palette,
): void {
  ctx.save();
  ctx.lineWidth = 2.2;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = palette.line;
  ctx.fillStyle = palette.body;

  const top = geo.headY - geo.headR; // Scheitel des Kopfes

  switch (type) {
    case KING:
      drawCrown(ctx, top, palette, true);
      break;
    case QUEEN:
      drawCrown(ctx, top, palette, false);
      break;
    case BISHOP:
      drawMitre(ctx, top, palette);
      break;
    case ROOK:
      drawBattlements(ctx, top, palette);
      break;
    case KNIGHT:
      drawHelmet(ctx, geo, palette);
      break;
    case PAWN:
      drawPawnBand(ctx, geo, palette);
      break;
  }

  ctx.restore();
}

/** Krone: Reif mit Zacken. Der König trägt zusätzlich ein Kreuz. */
function drawCrown(
  ctx: CanvasRenderingContext2D,
  top: number,
  palette: Palette,
  withCross: boolean,
): void {
  const bandTop = top - 1;
  const bandBottom = top + 6;

  // Zacken
  ctx.beginPath();
  ctx.moveTo(31, bandTop + 2);
  ctx.lineTo(36, bandTop - 9);
  ctx.lineTo(43, bandTop - 1);
  ctx.lineTo(50, bandTop - 13);
  ctx.lineTo(57, bandTop - 1);
  ctx.lineTo(64, bandTop - 9);
  ctx.lineTo(69, bandTop + 2);
  ctx.closePath();
  ctx.fillStyle = palette.accent;
  ctx.fill();
  ctx.stroke();

  // Reif
  ctx.beginPath();
  ctx.moveTo(30, bandTop + 1);
  ctx.lineTo(70, bandTop + 1);
  ctx.lineTo(68, bandBottom);
  ctx.lineTo(32, bandBottom);
  ctx.closePath();
  ctx.fillStyle = palette.body;
  ctx.fill();
  ctx.stroke();

  // Steine im Reif
  ctx.fillStyle = palette.accent;
  for (const x of [40, 50, 60]) {
    ctx.beginPath();
    ctx.arc(x, (bandTop + bandBottom) / 2 + 0.5, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  if (withCross) {
    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.rect(48.2, bandTop - 21, 3.6, 12);
    ctx.rect(44, bandTop - 17.5, 12, 3.6);
    ctx.fill();
    ctx.stroke();
  }
}

/** Mitra des Läufers: spitze Haube mit Schlitz. */
function drawMitre(ctx: CanvasRenderingContext2D, top: number, palette: Palette): void {
  ctx.beginPath();
  ctx.moveTo(35, top + 6);
  ctx.bezierCurveTo(35, top - 5, 44, top - 12, 50, top - 17);
  ctx.bezierCurveTo(56, top - 12, 65, top - 5, 65, top + 6);
  ctx.closePath();
  ctx.fillStyle = palette.body;
  ctx.fill();
  ctx.stroke();

  // Der charakteristische Schlitz
  ctx.beginPath();
  ctx.moveTo(56, top - 9);
  ctx.lineTo(47, top - 1);
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = palette.line;
  ctx.stroke();

  // Knauf
  ctx.beginPath();
  ctx.arc(50, top - 20, 2.8, 0, Math.PI * 2);
  ctx.fillStyle = palette.accent;
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.stroke();
}

/** Zinnenkranz des Turms. */
function drawBattlements(ctx: CanvasRenderingContext2D, top: number, palette: Palette): void {
  const bottom = top + 6;
  const crown = top - 16;

  ctx.beginPath();
  ctx.moveTo(32, bottom);
  ctx.lineTo(32, crown);
  ctx.lineTo(39, crown);
  ctx.lineTo(39, crown + 6);
  ctx.lineTo(46, crown + 6);
  ctx.lineTo(46, crown);
  ctx.lineTo(54, crown);
  ctx.lineTo(54, crown + 6);
  ctx.lineTo(61, crown + 6);
  ctx.lineTo(61, crown);
  ctx.lineTo(68, crown);
  ctx.lineTo(68, bottom);
  ctx.closePath();
  ctx.fillStyle = palette.body;
  ctx.fill();
  ctx.stroke();

  // Absatz unter den Zinnen
  ctx.beginPath();
  ctx.moveTo(30, bottom);
  ctx.lineTo(70, bottom);
  ctx.lineTo(68, bottom + 5);
  ctx.lineTo(32, bottom + 5);
  ctx.closePath();
  ctx.fillStyle = palette.bodyShade;
  ctx.fill();
  ctx.stroke();
}

/** Helm des Springers: Kuppel mit Kamm und Wangenklappen. */
function drawHelmet(ctx: CanvasRenderingContext2D, geo: Geometry, palette: Palette): void {
  const { headY, headR } = geo;
  const top = headY - headR;

  // Wangenklappen links und rechts, damit der Helm den Kopf umschließt.
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(50 + side * (headR - 1), headY - 4);
    ctx.quadraticCurveTo(50 + side * (headR + 3), headY + 6, 50 + side * (headR - 4), headY + 11);
    ctx.quadraticCurveTo(50 + side * (headR - 9), headY + 5, 50 + side * (headR - 7), headY - 4);
    ctx.closePath();
    ctx.fillStyle = palette.bodyShade;
    ctx.fill();
    ctx.stroke();
  }

  // Kuppel bis knapp über die Augen.
  ctx.beginPath();
  ctx.moveTo(50 - headR - 1, headY - 3);
  ctx.bezierCurveTo(50 - headR - 1, top - 8, 50 + headR + 1, top - 8, 50 + headR + 1, headY - 3);
  ctx.quadraticCurveTo(50, headY + 2, 50 - headR - 1, headY - 3);
  ctx.closePath();
  ctx.fillStyle = palette.body;
  ctx.fill();
  ctx.stroke();

  // Kamm
  ctx.beginPath();
  ctx.moveTo(50, top - 14);
  ctx.quadraticCurveTo(58, top - 12, 60, top + 2);
  ctx.quadraticCurveTo(54, top - 3, 50, top - 6);
  ctx.quadraticCurveTo(46, top - 3, 40, top + 2);
  ctx.quadraticCurveTo(42, top - 12, 50, top - 14);
  ctx.closePath();
  ctx.fillStyle = palette.accent;
  ctx.fill();
  ctx.stroke();
}

/** Der Bauer bekommt nur einen schlichten Ring als Kopfbedeckung. */
function drawPawnBand(ctx: CanvasRenderingContext2D, geo: Geometry, palette: Palette): void {
  const { headY, headR } = geo;
  ctx.beginPath();
  ctx.moveTo(50 - headR - 1, headY - headR + 5);
  ctx.quadraticCurveTo(50, headY - headR - 4, 50 + headR + 1, headY - headR + 5);
  ctx.quadraticCurveTo(50, headY - headR + 9, 50 - headR - 1, headY - headR + 5);
  ctx.closePath();
  ctx.fillStyle = palette.bodyShade;
  ctx.fill();
  ctx.stroke();
}
