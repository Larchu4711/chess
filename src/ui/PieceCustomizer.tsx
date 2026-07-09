import { useRef, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { PIECE_TYPES, PIECE_LABEL_DE, PIECE_GLYPH, skinKey } from '../game/types'
import type { Color, PieceType } from '../game/types'
import { config, STYLE_PRESETS } from '../config'
import type { StylePresetId } from '../config'
import { getStylizeProvider } from '../pieces/aiStylize'

export function PieceCustomizer() {
  const skins = useGameStore((s) => s.skins)
  const setSkin = useGameStore((s) => s.setSkin)
  const clearSkin = useGameStore((s) => s.clearSkin)

  const [color, setColor] = useState<Color>('w')
  const [applyAi, setApplyAi] = useState(false)
  const [style, setStyle] = useState<StylePresetId>(STYLE_PRESETS[0].id)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fileInput = useRef<HTMLInputElement>(null)
  const pendingType = useRef<PieceType | null>(null)

  const aiEnabled = config.aiStylizeEnabled

  function openPicker(type: PieceType) {
    pendingType.current = type
    fileInput.current?.click()
  }

  async function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const type = pendingType.current
    e.target.value = '' // allow re-picking the same file
    if (!file || !type) return

    const key = skinKey(color, type)
    setError(null)

    // Revoke any previous image URL for this slot before replacing it.
    const previous = useGameStore.getState().skins[key]
    if (previous) URL.revokeObjectURL(previous.imageUrl)

    if (applyAi && aiEnabled) {
      const provider = getStylizeProvider()
      if (provider) {
        setBusyKey(key)
        try {
          const blob = await provider.stylize(file, style)
          setSkin(key, { imageUrl: URL.createObjectURL(blob), ai: true })
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Stilisierung fehlgeschlagen')
          setSkin(key, { imageUrl: URL.createObjectURL(file), ai: false })
        } finally {
          setBusyKey(null)
        }
        return
      }
    }

    setSkin(key, { imageUrl: URL.createObjectURL(file), ai: false })
  }

  return (
    <div className="section customizer">
      <h2>Figuren personalisieren</h2>

      <div className="color-tabs">
        <button
          className={`btn ${color === 'w' ? 'active' : ''}`}
          onClick={() => setColor('w')}
        >
          Weiß
        </button>
        <button
          className={`btn ${color === 'b' ? 'active' : ''}`}
          onClick={() => setColor('b')}
        >
          Schwarz
        </button>
      </div>

      <div className="piece-grid">
        {PIECE_TYPES.map((type) => {
          const key = skinKey(color, type)
          const skin = skins[key]
          const busy = busyKey === key
          return (
            <div className="piece-slot" key={type}>
              <div
                className="thumb"
                style={skin ? { backgroundImage: `url(${skin.imageUrl})` } : undefined}
                onClick={() => !busy && openPicker(type)}
                title="Foto hochladen"
              >
                {busy ? <span className="spinner" /> : skin ? null : PIECE_GLYPH[type]}
                {skin?.ai && <span className="badge-ai">KI</span>}
              </div>
              <div className="name">{PIECE_LABEL_DE[type]}</div>
              {skin ? (
                <button className="clear" onClick={() => clearSkin(key)}>
                  entfernen
                </button>
              ) : (
                <button className="clear" style={{ color: 'var(--muted)' }} onClick={() => openPicker(type)}>
                  hochladen
                </button>
              )}
            </div>
          )
        })}
      </div>

      {aiEnabled && (
        <div className="stylize-row">
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <input type="checkbox" checked={applyAi} onChange={(e) => setApplyAi(e.target.checked)} />
            KI-Stil
          </label>
          <select value={style} onChange={(e) => setStyle(e.target.value as StylePresetId)} disabled={!applyAi}>
            {STYLE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <div className="hint" style={{ color: 'var(--danger)' }}>{error}</div>}

      <div className="hint">
        Lade für jede Figurenart ein Foto hoch — es erscheint als Porträt-Medaillon auf allen
        Figuren dieser Art.
        {!aiEnabled && ' KI-Stilisierung ist deaktiviert (kein Endpoint konfiguriert).'}
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={onFileChosen}
      />
    </div>
  )
}
