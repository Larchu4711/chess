# Foto-Schach 3D ♞

Ein hochwertiges **3D-Schachspiel für den Browser**, bei dem jede Spielfigur das
**Foto einer echten Person** tragen kann. Lade für jede Figurenart ein Bild hoch —
es erscheint als Porträt-Medaillon auf allen Figuren dieser Art. Gespielt wird
**gegen den Computer** mit einstellbarer Schwierigkeit.

## Features

- **Vollständige Schachregeln** (Zuggenerierung, Schach/Matt/Patt, Remis) via `chess.js`.
- **3D-Brett & -Figuren**, komplett prozedural in Code erzeugt (klassische
  Staunton-Silhouetten) — keine externen Modelldateien, voll deploybar.
- **KI-Gegner** (Alpha-Beta-Minimax) in einem Web Worker, 4 Schwierigkeitsstufen.
  Läuft komplett offline, kein WASM, keine speziellen HTTP-Header nötig.
- **Foto-Personalisierung mit 3D-Kopf:** pro Spielerfarbe und Figurenart ein Foto
  hochladen; es wird auf eine plastisch geformte **3D-Kopf-Büste** über der Figur
  projiziert (Gesicht auf der Front, Seiten/Rücken als Marmor-/Onyx-Skulptur, von
  der Szene beleuchtet). Ein echtes 3D-Objekt, das man umkreisen kann — komplett
  im Browser erzeugt, ohne ML-Modell oder Netzwerk.
- **Optionale KI-Stilisierung:** Fotos können durch eine Bild-KI in eine
  stilisierte Büste/Statue verwandelt werden — strikt optional und gekapselt.

## Schnellstart

```bash
npm install
npm run dev      # Dev-Server auf http://localhost:5173
```

Produktions-Build:

```bash
npm run build    # Typecheck + statischer Build nach dist/
npm run preview  # Build lokal ansehen
```

Das Ergebnis in `dist/` ist eine statische Web-App und kann direkt bei
Vercel, Netlify o. ä. deployed werden.

## Bedienung

- **Ziehen:** Figur anklicken → legale Zielfelder leuchten grün → Zielfeld anklicken.
  Du spielst Weiß, der Computer antwortet automatisch.
- **Kamera:** mit der Maus drehen/zoomen (Orbit-Controls).
- **Schwierigkeit / Neues Spiel / Zug zurück:** im Seitenpanel unter „Spiel".
- **Figuren personalisieren:** im Panel Farbe wählen, auf eine Figurenkachel
  klicken und ein Foto hochladen. Mit „entfernen" wird das Foto wieder gelöscht.

## Optionale KI-Stilisierung einrichten

Ohne Konfiguration läuft die App vollständig mit direktem Foto-Mapping. Um die
KI-Stilisierung zu aktivieren:

1. Endpoint bereitstellen: `api/stylize.ts` ist eine Referenz-Serverless-Funktion
   (Vercel-Stil). Trage darin in `callImageProvider()` deinen Bild-API-Anbieter ein.
2. Umgebungsvariablen setzen (siehe `.env.example`):
   - `VITE_STYLIZE_ENDPOINT=/api/stylize` (aktiviert die UI-Option)
   - `OPENAI_API_KEY=…` (nur serverseitig; wird **nie** an den Browser gesendet)

Der API-Schlüssel bleibt ausschließlich in der Serverless-Funktion. Ist kein
Endpoint gesetzt, wird die KI-Option in der UI ausgeblendet.

## Technik

| Bereich        | Wahl                                             |
| -------------- | ------------------------------------------------ |
| Build / UI     | Vite + React + TypeScript                        |
| 3D             | three.js, @react-three/fiber, @react-three/drei  |
| Schachregeln   | chess.js                                         |
| KI-Gegner      | eigener Alpha-Beta-Minimax (Web Worker)          |
| State          | zustand                                          |

### Projektstruktur

```
src/
  game/        chessEngine.ts, ai.ts, aiWorker.ts, types.ts
  store/       gameStore.ts            # zentraler Spielzustand
  three/       Scene, Board, Piece, pieceGeometry, coords
  pieces/      portraitTexture (Medaillon), aiStylize, faceCutout (Stub)
  ui/          StatusBar, GameControls, MoveHistory, PieceCustomizer
api/           stylize.ts              # optionale Serverless-Referenz
```

## Roadmap (bewusst außerhalb des MVP)

- Online-Multiplayer (Backend, Echtzeit-Sync, Konten)
- ML-basierte 3D-Gesichtsrekonstruktion (3DMM) für noch höhere Detailtreue;
  Freistellen via Segmentierung (Gerüst liegt in `pieces/faceCutout.ts`)
- Schlag-Effekte, Sound, mehrere Material-Themes
- Speichern/Laden, Zug-Anzeige in Standardnotation exportieren
