/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the optional AI stylization endpoint (e.g. "/api/stylize"). */
  readonly VITE_STYLIZE_ENDPOINT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
