/**
 * Kurze Tonrückmeldungen.
 *
 * Die Klänge werden mit der Web Audio API erzeugt statt als Dateien
 * mitgeliefert: Das spart Ladezeit und hält die Seite vollständig
 * eigenständig. Ein AudioContext darf erst nach einer Nutzeraktion starten,
 * deshalb wird er beim ersten Ton angelegt — und der kommt immer nach einem
 * Klick oder Tippen.
 */

const STORAGE_KEY = 'chess.sound';

type Voice = {
  frequency: number;
  /** Zielfrequenz am Ende des Tons; gleich der Startfrequenz = kein Gleiten. */
  glideTo?: number;
  duration: number;
  gain: number;
  type: OscillatorType;
  delay?: number;
};

const VOICES: Record<string, Voice[]> = {
  move: [{ frequency: 320, duration: 0.07, gain: 0.16, type: 'triangle' }],
  capture: [
    { frequency: 190, glideTo: 120, duration: 0.13, gain: 0.22, type: 'square' },
    { frequency: 90, duration: 0.1, gain: 0.12, type: 'triangle', delay: 0.02 },
  ],
  castle: [
    { frequency: 300, duration: 0.06, gain: 0.15, type: 'triangle' },
    { frequency: 300, duration: 0.06, gain: 0.15, type: 'triangle', delay: 0.09 },
  ],
  check: [
    { frequency: 660, duration: 0.09, gain: 0.16, type: 'sine' },
    { frequency: 880, duration: 0.11, gain: 0.16, type: 'sine', delay: 0.1 },
  ],
  end: [
    { frequency: 520, duration: 0.14, gain: 0.16, type: 'sine' },
    { frequency: 390, duration: 0.14, gain: 0.16, type: 'sine', delay: 0.15 },
    { frequency: 260, duration: 0.3, gain: 0.16, type: 'sine', delay: 0.3 },
  ],
};

export type SoundName = keyof typeof VOICES;

export class Sound {
  private context: AudioContext | null = null;
  private on: boolean;

  constructor() {
    this.on = localStorage.getItem(STORAGE_KEY) !== 'off';
  }

  get enabled(): boolean {
    return this.on;
  }

  setEnabled(value: boolean): void {
    this.on = value;
    try {
      localStorage.setItem(STORAGE_KEY, value ? 'on' : 'off');
    } catch {
      // Ohne Speicher gilt die Einstellung eben nur für diese Sitzung.
    }
  }

  play(name: SoundName): void {
    if (!this.on) return;
    const voices = VOICES[name];
    if (!voices) return;

    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();

    for (const voice of voices) {
      const start = ctx.currentTime + (voice.delay ?? 0);
      const end = start + voice.duration;

      const oscillator = ctx.createOscillator();
      oscillator.type = voice.type;
      oscillator.frequency.setValueAtTime(voice.frequency, start);
      if (voice.glideTo !== undefined) {
        oscillator.frequency.exponentialRampToValueAtTime(voice.glideTo, end);
      }

      // Weich ein- und ausblenden, sonst knackt es an den Rändern.
      const envelope = ctx.createGain();
      envelope.gain.setValueAtTime(0.0001, start);
      envelope.gain.exponentialRampToValueAtTime(voice.gain, start + 0.012);
      envelope.gain.exponentialRampToValueAtTime(0.0001, end);

      oscillator.connect(envelope).connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(end + 0.02);
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.context) return this.context;
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.context = new Ctor();
      return this.context;
    } catch {
      return null;
    }
  }
}
