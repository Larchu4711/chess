/**
 * Reference serverless endpoint for AI photo stylization (Vercel-style handler).
 *
 * The browser never sees the provider API key — it lives only in this
 * server-side function. Deploy it (e.g. on Vercel) and set
 * `VITE_STYLIZE_ENDPOINT=/api/stylize` plus `OPENAI_API_KEY` to enable AI
 * stylization in the app. Without this, the app still runs fully with direct
 * photo mapping.
 *
 * This is intentionally provider-agnostic pseudo-wiring: swap the fetch block
 * for whichever image-to-image API you use. The contract with the frontend is:
 *   Request  JSON: { image: <data-url>, style: <preset id> }
 *   Response JSON: { image: <data-url of a PNG> }   (or an image/* body)
 */

interface StylizeBody {
  image?: string
  style?: string
}

const STYLE_PROMPTS: Record<string, string> = {
  'marble-bust': 'a polished white marble bust sculpture of this person, museum lighting, neutral background',
  'bronze-statue': 'a bronze statue bust of this person, patina finish, neutral background',
  'oil-portrait': 'a classical oil painting portrait of this person, chiaroscuro lighting',
  'fantasy-hero': 'a heroic fantasy character portrait based on this person, cinematic',
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Stylization not configured' }), {
      status: 501,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: StylizeBody
  try {
    body = (await req.json()) as StylizeBody
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
  }

  const { image, style } = body
  if (!image) {
    return new Response(JSON.stringify({ error: 'Missing image' }), { status: 400 })
  }
  const prompt = STYLE_PROMPTS[style ?? ''] ?? STYLE_PROMPTS['marble-bust']

  // ── Provider call (replace with your image-to-image API of choice) ───────
  // Example shape for an OpenAI-style images edit/generation request. The
  // exact request/response fields depend on the provider and model you pick.
  try {
    const resultImage = await callImageProvider(apiKey, image, prompt)
    return new Response(JSON.stringify({ image: resultImage }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stylization failed'
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

/**
 * Stub for the actual provider call. Wire this to your chosen image API and
 * return a data URL (or raw bytes) of the stylized portrait. Kept as a stub so
 * the repo has no hard dependency on any specific paid provider.
 */
async function callImageProvider(_apiKey: string, _image: string, _prompt: string): Promise<string> {
  throw new Error('Image provider not wired in. See api/stylize.ts callImageProvider().')
}
