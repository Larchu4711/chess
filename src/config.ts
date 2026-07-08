/**
 * App-wide configuration and feature flags.
 *
 * AI stylization is optional: it is only enabled when VITE_STYLIZE_ENDPOINT is
 * set at build/dev time. Without it, the app runs fully with direct photo
 * mapping (the medallion approach) — no API key, no network required.
 */
export const config = {
  stylizeEndpoint: import.meta.env.VITE_STYLIZE_ENDPOINT?.trim() || '',
  get aiStylizeEnabled(): boolean {
    return this.stylizeEndpoint.length > 0
  },
}

/** Stylization presets offered in the UI. Sent as the `style` field. */
export const STYLE_PRESETS = [
  { id: 'marble-bust', label: 'Marmorbüste' },
  { id: 'bronze-statue', label: 'Bronzestatue' },
  { id: 'oil-portrait', label: 'Ölporträt' },
  { id: 'fantasy-hero', label: 'Fantasy-Held' },
] as const

export type StylePresetId = (typeof STYLE_PRESETS)[number]['id']
