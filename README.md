# Schach mit eigenen Figuren

Schach im Browser, bei dem jeder Spieler seine Figuren mit eigenen Fotos
gestaltet: Das Gesicht aus dem Bild wird in den Kopf der Figur eingesetzt, die
Kopfbedeckung bleibt typbestimmend. Der König trägt also die Krone, der Läufer
die Mitra, der Springer den Helm — aber mit deinem Gesicht.

## Ausprobieren

```bash
npm install
npm run dev
```

Weitere Befehle: `npm test` (Engine-Tests), `npm run build` (Produktionsbuild
nach `dist/`), `npm run preview` (den Build lokal ansehen).

Das Ergebnis ist eine rein statische Seite — es gibt keinen Server und keine
Konten. Alles läuft im Browser.

## Figuren gestalten

Über **Figuren gestalten** öffnet sich der Designer:

- Für Weiß und Schwarz getrennt ein Foto hochladen — per Auswahl, Ziehen und
  Ablegen oder Einfügen aus der Zwischenablage.
- Das Foto lässt sich pro Figurentyp einzeln vergeben oder mit
  **Auf alle Figuren übernehmen** auf einen Schlag für alle sechs.
- Zoom, Verschiebung und Drehung richten den Bildausschnitt im Kopfkreis aus.
  Wo der Browser die `FaceDetector`-API mitbringt, wird das Gesicht beim
  Hochladen automatisch mittig gesetzt; sonst startet es mit einem sinnvollen
  Standardausschnitt.
- Namen der Spieler werden in der Statuszeile und über dem Brett angezeigt.

Fotos und Einstellungen liegen in der IndexedDB des Browsers und überstehen ein
Neuladen. Sie verlassen das Gerät nicht — es gibt keinen Upload irgendwohin.

## Spielen

- Ziehen per Maus/Finger oder per Klick auf Ausgangs- und Zielfeld; legale
  Züge werden markiert.
- Gegen den Computer (vier Stufen) oder zu zweit am selben Gerät.
- Umwandlung mit Auswahl der Figur, Zurücknehmen, Brett drehen, Zugliste in
  algebraischer Notation mit hervorgehobenem letzten Zug.
- Tonrückmeldung für Zug, Schlag, Rochade, Schach und Partieende, abschaltbar
  über das Notensymbol neben der Statuszeile. Die Klänge werden im Browser
  erzeugt, es werden keine Audiodateien geladen.
- Auf dem Handy nimmt das Brett die volle Breite ein, im Designer schrumpft
  die Vorschau, damit der Hochladen-Knopf ohne Scrollen erreichbar bleibt.
- Vollständige Regeln inklusive Rochade, en passant, Umwandlung, Matt, Patt,
  50-Züge-Regel, dreifacher Stellungswiederholung und Materialmangel.

## Aufbau

```
src/engine/   Regelkern: Stellung, Zuggenerierung, FEN, SAN, Partieende
src/ai/       Bewertung und Suche, ausgelagert in einen Web Worker
src/pieces/   Figurenzeichnung, Bildimport, Sprite-Erzeugung, Speicherung
src/ui/       Brettdarstellung und Designer
tests/        perft-, Regel- und Suchtests
```

Ein paar Entscheidungen, die den Rest erklären:

**0x88-Brett.** Die Stellung ist ein Array mit 128 Feldern, von denen nur die
halbe Zeile echte Felder sind. Ob ein Feld auf dem Brett liegt, ist damit eine
einzige Bit-Operation (`sq & 0x88`), was die Zuggenerierung kurz und schnell
hält.

**Pseudo-legal erzeugen, dann filtern.** Züge entstehen ohne Rücksicht auf
Fesselungen und werden anschließend verworfen, wenn sie den eigenen König im
Schach zurücklassen. Das ist langsamer als eine direkte Legalitätsprüfung, aber
erheblich schwerer falsch zu machen — die perft-Tests belegen die Korrektheit
für die bekannten Referenzstellungen.

**Figuren als Canvas-Sprites.** Jede Figur wird aus Sockel, Körper, Kopfkreis
und Kopfbedeckung gezeichnet und einmal pro Gestaltung in eine Data-URL
gerendert, die das Brett als `<img>` anzeigt. Ein Zug zeichnet damit nichts neu.

**Spielstärke über erlaubte Nachlässigkeit.** Die schwachen Stufen bewerten
alle Wurzelzüge exakt und greifen dann zufällig zu einem, der höchstens um
einen festgelegten Betrag schlechter ist. Zufall auf die Alpha-Beta-Rückgaben zu
addieren wäre der naheliegende Weg — aber falsch: Abgeschnittene Züge liefern
nur Schranken, keine Bewertungen, und dann sieht jeder Blunder gleich gut aus.

## Tests

`npm test` prüft die Zuggenerierung mit perft gegen sechs Referenzstellungen,
die Sonderzüge und Remis-Regeln einzeln, sowie die Suche daraufhin, dass sie
Matt in eins findet und keine Figur verschenkt.
