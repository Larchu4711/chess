/**
 * Der Figuren-Designer.
 *
 * Hier lädt jeder Spieler seine Fotos hoch und richtet sie im Kopf der Figur
 * aus — pro Figurentyp einzeln oder mit einem Klick für alle. Änderungen
 * schlagen sofort auf das Brett durch.
 */

import { Color, PieceType } from '../engine/types';
import {
  DesignSet,
  PIECE_LABEL,
  PIECE_TYPES,
  defaultDesignSet,
  defaultTransform,
  pruneUnusedImages,
} from '../pieces/design';
import { autoFaceTransform, fileToDataUrl } from '../pieces/import';
import { paintPiece } from '../pieces/render';

export interface DesignerOptions {
  getSet(): DesignSet;
  /** Wird nach jeder Änderung gerufen: Sprites neu erzeugen und speichern. */
  onChange(): void;
}

export class Designer {
  private modal: HTMLElement;
  private preview: HTMLCanvasElement;
  private picker: HTMLElement;
  private nameInput: HTMLInputElement;
  private fileInput: HTMLInputElement;
  private dropzone: HTMLElement;
  private note: HTMLElement;
  private hint: HTMLElement;
  private sliders: Record<'scale' | 'dx' | 'dy' | 'rotate', HTMLInputElement>;
  private thumbs = new Map<PieceType, HTMLCanvasElement>();

  private activeColor: Color = 0;
  private activeType: PieceType = PIECE_TYPES[0];

  constructor(private readonly options: DesignerOptions) {
    this.modal = document.getElementById('designer') as HTMLElement;
    this.preview = document.getElementById('preview') as HTMLCanvasElement;
    this.picker = document.getElementById('piece-picker') as HTMLElement;
    this.nameInput = document.getElementById('player-name') as HTMLInputElement;
    this.fileInput = document.getElementById('file-input') as HTMLInputElement;
    this.dropzone = document.getElementById('dropzone') as HTMLElement;
    this.note = document.getElementById('designer-note') as HTMLElement;
    this.hint = document.getElementById('designer-hint') as HTMLElement;
    this.sliders = {
      scale: document.getElementById('slider-scale') as HTMLInputElement,
      dx: document.getElementById('slider-dx') as HTMLInputElement,
      dy: document.getElementById('slider-dy') as HTMLInputElement,
      rotate: document.getElementById('slider-rotate') as HTMLInputElement,
    };

    this.buildPicker();
    this.attachEvents();
  }

  open(): void {
    this.modal.hidden = false;
    this.refresh();
  }

  close(): void {
    this.modal.hidden = true;
  }

  private get set(): DesignSet {
    return this.options.getSet();
  }

  private get design() {
    return this.set.players[this.activeColor].pieces[this.activeType];
  }

  private buildPicker(): void {
    this.picker.innerHTML = '';
    for (const type of PIECE_TYPES) {
      const button = document.createElement('button');
      button.className = 'piece-chip';
      button.type = 'button';
      button.dataset.type = String(type);

      const canvas = document.createElement('canvas');
      canvas.width = 96;
      canvas.height = 96;
      canvas.className = 'piece-chip__canvas';
      button.appendChild(canvas);

      const label = document.createElement('span');
      label.textContent = PIECE_LABEL[type];
      button.appendChild(label);

      button.addEventListener('click', () => {
        this.activeType = type;
        this.refresh();
      });

      this.thumbs.set(type, canvas);
      this.picker.appendChild(button);
    }
  }

  private attachEvents(): void {
    for (const el of document.querySelectorAll('[data-close-designer]')) {
      el.addEventListener('click', () => this.close());
    }
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !this.modal.hidden) this.close();
    });

    for (const tab of document.querySelectorAll<HTMLElement>('#player-tabs .tab')) {
      tab.addEventListener('click', () => {
        this.activeColor = Number(tab.dataset.color) as Color;
        this.refresh();
      });
    }

    this.nameInput.addEventListener('input', () => {
      this.set.players[this.activeColor].name = this.nameInput.value;
      this.options.onChange();
    });

    this.fileInput.addEventListener('change', () => {
      const file = this.fileInput.files?.[0];
      if (file) void this.acceptImage(file);
      this.fileInput.value = '';
    });

    this.dropzone.addEventListener('dragover', (event) => {
      event.preventDefault();
      this.dropzone.classList.add('dropzone--over');
    });
    this.dropzone.addEventListener('dragleave', () => {
      this.dropzone.classList.remove('dropzone--over');
    });
    this.dropzone.addEventListener('drop', (event) => {
      event.preventDefault();
      this.dropzone.classList.remove('dropzone--over');
      const file = event.dataTransfer?.files?.[0];
      if (file) void this.acceptImage(file);
    });

    // Bild aus der Zwischenablage einfügen, solange der Designer offen ist.
    document.addEventListener('paste', (event) => {
      if (this.modal.hidden) return;
      const item = [...(event.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'));
      const file = item?.getAsFile();
      if (file) void this.acceptImage(file);
    });

    for (const [key, input] of Object.entries(this.sliders)) {
      input.addEventListener('input', () => {
        const transform = this.design.transform;
        const value = Number(input.value);
        if (key === 'scale') transform.scale = value;
        else if (key === 'dx') transform.dx = value;
        else if (key === 'dy') transform.dy = value;
        else transform.rotate = value;
        void this.repaint();
        this.options.onChange();
      });
    }

    document.getElementById('apply-all')?.addEventListener('click', () => {
      const source = this.design;
      for (const type of PIECE_TYPES) {
        this.set.players[this.activeColor].pieces[type] = {
          imageId: source.imageId,
          transform: { ...source.transform },
        };
      }
      this.afterChange('Auf alle Figuren übernommen.');
    });

    document.getElementById('remove-image')?.addEventListener('click', () => {
      this.design.imageId = null;
      this.design.transform = defaultTransform();
      pruneUnusedImages(this.set);
      this.afterChange('Foto entfernt.');
    });

    document.getElementById('reset-all')?.addEventListener('click', () => {
      if (!confirm('Alle Fotos und Einstellungen beider Spieler zurücksetzen?')) return;
      const fresh = defaultDesignSet();
      const target = this.set;
      target.images = fresh.images;
      target.players = fresh.players;
      this.afterChange('Zurückgesetzt.');
    });
  }

  private async acceptImage(file: File): Promise<void> {
    this.note.textContent = 'Bild wird verarbeitet …';
    try {
      const dataUrl = await fileToDataUrl(file);
      const id = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      this.set.images[id] = dataUrl;
      this.design.imageId = id;
      this.design.transform = await autoFaceTransform(dataUrl);
      pruneUnusedImages(this.set);
      this.afterChange('Foto übernommen. Mit den Reglern feinjustieren.');
    } catch {
      this.note.textContent = 'Das Bild konnte nicht gelesen werden.';
    }
  }

  private afterChange(message: string): void {
    this.note.textContent = message;
    this.options.onChange();
    this.refresh();
  }

  private refresh(): void {
    for (const tab of document.querySelectorAll<HTMLElement>('#player-tabs .tab')) {
      tab.classList.toggle('tab--active', Number(tab.dataset.color) === this.activeColor);
    }
    for (const chip of this.picker.querySelectorAll<HTMLElement>('.piece-chip')) {
      chip.classList.toggle('piece-chip--active', Number(chip.dataset.type) === this.activeType);
    }

    this.nameInput.value = this.set.players[this.activeColor].name;

    const transform = this.design.transform;
    this.sliders.scale.value = String(transform.scale);
    this.sliders.dx.value = String(transform.dx);
    this.sliders.dy.value = String(transform.dy);
    this.sliders.rotate.value = String(transform.rotate);

    const hasImage = Boolean(this.design.imageId);
    for (const input of Object.values(this.sliders)) input.disabled = !hasImage;
    this.hint.textContent = hasImage
      ? `${PIECE_LABEL[this.activeType]} – Ausschnitt mit den Reglern anpassen.`
      : 'Lade ein Foto hoch — das Gesicht wird in den Kopf der Figur eingesetzt.';

    void this.repaint();
  }

  private async repaint(): Promise<void> {
    await paintPiece(this.preview, this.set, this.activeColor, this.activeType);
    await Promise.all(
      PIECE_TYPES.map((type) => {
        const canvas = this.thumbs.get(type);
        return canvas ? paintPiece(canvas, this.set, this.activeColor, type) : Promise.resolve();
      }),
    );
  }
}
