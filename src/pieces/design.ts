/** Datenmodell der Figurengestaltung. */

import { BISHOP, Color, KING, KNIGHT, PAWN, PieceType, QUEEN, ROOK } from '../engine/types';

/** Wie das Foto im Kopfbereich der Figur sitzt. */
export interface FaceTransform {
  /** 1 = Bild füllt den Kopfkreis gerade aus. */
  scale: number;
  /** Verschiebung in Vielfachen des Kopfradius. */
  dx: number;
  dy: number;
  /** Drehung im Bogenmaß. */
  rotate: number;
}

export interface PieceDesign {
  /** Verweis auf ein Bild in `DesignSet.images`, oder null für die Standardfigur. */
  imageId: string | null;
  transform: FaceTransform;
}

export interface PlayerDesign {
  name: string;
  pieces: Record<PieceType, PieceDesign>;
}

export interface DesignSet {
  /** Bild-ID → Data-URL. Mehrere Figuren können sich ein Bild teilen. */
  images: Record<string, string>;
  players: [PlayerDesign, PlayerDesign];
}

export const PIECE_TYPES: PieceType[] = [KING, QUEEN, ROOK, BISHOP, KNIGHT, PAWN];

export const PIECE_LABEL: Record<PieceType, string> = {
  [KING]: 'König',
  [QUEEN]: 'Dame',
  [ROOK]: 'Turm',
  [BISHOP]: 'Läufer',
  [KNIGHT]: 'Springer',
  [PAWN]: 'Bauer',
};

/**
 * Leicht hineingezoomt: Auf typischen Portraitfotos liegt das Gesicht mittig
 * mit reichlich Rand, deshalb trifft ein Ausschnitt besser als das ganze Bild.
 */
export function defaultTransform(): FaceTransform {
  return { scale: 1.4, dx: 0, dy: -0.05, rotate: 0 };
}

export function defaultPlayerDesign(name: string): PlayerDesign {
  const pieces = {} as Record<PieceType, PieceDesign>;
  for (const type of PIECE_TYPES) {
    pieces[type] = { imageId: null, transform: defaultTransform() };
  }
  return { name, pieces };
}

export function defaultDesignSet(): DesignSet {
  return {
    images: {},
    players: [defaultPlayerDesign('Weiß'), defaultPlayerDesign('Schwarz')],
  };
}

export function designFor(set: DesignSet, color: Color, type: PieceType): PieceDesign {
  return set.players[color].pieces[type];
}

/**
 * Entfernt Bilder, auf die keine Figur mehr verweist — sonst wächst der
 * Speicher mit jedem Austausch weiter an.
 */
export function pruneUnusedImages(set: DesignSet): void {
  const used = new Set<string>();
  for (const player of set.players) {
    for (const type of PIECE_TYPES) {
      const id = player.pieces[type].imageId;
      if (id) used.add(id);
    }
  }
  for (const id of Object.keys(set.images)) {
    if (!used.has(id)) delete set.images[id];
  }
}

/** Stabiler Schlüssel für den Sprite-Cache. */
export function designKey(design: PieceDesign): string {
  if (!design.imageId) return 'plain';
  const t = design.transform;
  return `${design.imageId}:${t.scale.toFixed(3)}:${t.dx.toFixed(3)}:${t.dy.toFixed(3)}:${t.rotate.toFixed(3)}`;
}
