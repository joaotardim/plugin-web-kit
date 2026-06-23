/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POCKETBASE_URL: string
  readonly VITE_APPINSIGHTS_CONNECTION_STRING?: string
  readonly VITE_COMPANY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
