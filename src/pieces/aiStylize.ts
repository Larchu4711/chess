import { config } from '../config'
import type { StylePresetId } from '../config'

/**
 * Optional AI stylization. Turns an uploaded photo into a stylized portrait
 * (marble bust, bronze statue, ...) via a serverless endpoint that keeps the
 * provider API key server-side. Strictly optional: callers check
 * `config.aiStylizeEnabled` and fall back to the raw photo when disabled.
 */
export interface StylizeProvider {
  stylize(image: Blob, style: StylePresetId): Promise<Blob>
}

/** Default provider: POSTs to the configured endpoint and expects an image back. */
class EndpointStylizeProvider implements StylizeProvider {
  constructor(private endpoint: string) {}

  async stylize(image: Blob, style: StylePresetId): Promise<Blob> {
    const dataUrl = await blobToDataUrl(image)
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataUrl, style }),
    })
    if (!res.ok) {
      throw new Error(`Stilisierung fehlgeschlagen (${res.status})`)
    }
    const contentType = res.headers.get('Content-Type') ?? ''
    if (contentType.startsWith('image/')) {
      return await res.blob()
    }
    // Endpoint returned JSON with a base64 / data-url image field.
    const json = (await res.json()) as { image?: string }
    if (!json.image) throw new Error('Antwort enthielt kein Bild')
    return await dataUrlToBlob(json.image)
  }
}

export function getStylizeProvider(): StylizeProvider | null {
  if (!config.aiStylizeEnabled) return null
  return new EndpointStylizeProvider(config.stylizeEndpoint)
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl)
  return await res.blob()
}
