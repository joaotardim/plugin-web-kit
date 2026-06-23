/**
 * Utilitários compartilhados pelos scripts Node.js.
 * loadEnv: carrega variáveis de .env sem sobrescrever as já definidas no shell.
 * authenticateSuperuser: autentica no PocketBase e retorna o token JWT.
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export function loadEnv() {
  const envPath = resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const raw = trimmed.slice(eq + 1)
    const val = /^['"]/.test(raw.trim())
      ? raw.trim().slice(1, -1)
      : raw.replace(/\s+#.*$/, '').trim()
    if (key && !(key in process.env)) process.env[key] = val
  }
}

/**
 * Autentica como superusuário do PocketBase e retorna o token JWT.
 * Lê PB_SUPERUSER_EMAIL e PB_SUPERUSER_PASSWORD do ambiente, ou aceita
 * credenciais explícitas via segundo argumento (usado por pb-oauth.mjs).
 */
export async function authenticateSuperuser(pbUrl, creds = {}) {
  const identity = creds.identity ?? process.env.PB_SUPERUSER_EMAIL
  const password = creds.password ?? process.env.PB_SUPERUSER_PASSWORD
  const res = await fetch(`${pbUrl}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity, password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      `Autenticação falhou: ${err.message ?? res.statusText}. ` +
      `Confira PB_SUPERUSER_EMAIL/PB_SUPERUSER_PASSWORD no .env. ` +
      `Se o superusuário não existir no banco, rode "npm start" (recria automaticamente) ` +
      `ou "npm run pb:superuser -- <email> <senha>".`,
    )
  }
  return (await res.json()).token
}
