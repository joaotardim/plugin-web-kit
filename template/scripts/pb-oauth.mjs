#!/usr/bin/env node
/**
 * Configura o provider Microsoft (Entra ID) no PocketBase via API.
 * Pré-requisito: PocketBase rodando (npm run pb ou npm start).
 * Uso: npm run pb:oauth
 *
 * Modo não-interativo (CI/CD) — defina as variáveis de ambiente:
 *   PB_SUPERUSER_EMAIL     email do superusuário do PocketBase
 *   PB_SUPERUSER_PASSWORD  senha do superusuário
 *   ENTRA_CLIENT_ID        Application (client) ID do App Registration
 *   ENTRA_CLIENT_SECRET    Client secret (opcional — omita para fluxo SPA)
 *   ENTRA_TENANT_ID        Tenant ID (opcional — omita para multi-tenant)
 */
import { createInterface } from 'node:readline'
import { loadEnv } from './_env.mjs'

loadEnv()

const PB_URL = process.env.VITE_POCKETBASE_URL ?? 'http://localhost:8090'
const CI     = !process.stdin.isTTY || process.env.CI === 'true'

// ── Prompts ───────────────────────────────────────────────────────────────────

function askLine(prompt) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(prompt, (a) => { rl.close(); resolve(a.trim()) })
  })
}

function askPassword(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt)

    if (!process.stdin.isTTY) {
      const rl = createInterface({ input: process.stdin })
      rl.once('line', (l) => { rl.close(); resolve(l.trim()) })
      return
    }

    let pw = ''
    const onData = (char) => {
      if (char === '\n' || char === '\r' || char === '') {
        process.stdin.setRawMode(false)
        process.stdin.removeListener('data', onData)
        process.stdin.pause()
        process.stdout.write('\n')
        resolve(pw)
      } else if (char === '') {
        process.stdout.write('\n'); process.exit(0)
      } else if (char === '' || char === '') {
        if (pw.length > 0) { pw = pw.slice(0, -1); process.stdout.write('\b \b') }
      } else {
        pw += char; process.stdout.write('*')
      }
    }

    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', onData)
  })
}

async function resolveEnv(envKey, prompt, secret = false) {
  if (process.env[envKey]) {
    if (!CI) console.log(`${prompt}(via ${envKey})`)
    return process.env[envKey]
  }
  return secret ? askPassword(prompt) : askLine(prompt)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Modo não-interativo sem credenciais → pula silenciosamente
  if (CI && !process.env.ENTRA_CLIENT_ID) {
    console.log('pb:oauth: ENTRA_CLIENT_ID não definido — pulando.')
    return
  }

  console.log('Configuração do Microsoft Entra ID no PocketBase')
  console.log('─'.repeat(50))
  console.log(`PocketBase: ${PB_URL}\n`)

  // 1. Autenticar como superusuário
  if (!CI) console.log('Credenciais do superusuário do PocketBase:\n')

  const identity = await resolveEnv('PB_SUPERUSER_EMAIL',    'Email: ')
  const password = await resolveEnv('PB_SUPERUSER_PASSWORD', 'Senha: ', true)

  const authRes = await fetch(
    `${PB_URL}/api/collections/_superusers/auth-with-password`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity, password }),
    },
  )

  if (!authRes.ok) {
    const err = await authRes.json().catch(() => ({}))
    console.error('\nFalha na autenticação:', err.message ?? authRes.statusText)
    if (!process.env.PB_SUPERUSER_EMAIL) {
      console.error('Dica: use "npm run pb:superuser -- <email> <senha>" para redefinir a senha.\n')
    }
    process.exit(1)
  }

  const { token } = await authRes.json()
  console.log('Autenticado.\n')

  // 2. Coletar dados do Entra ID
  if (!CI) {
    console.log('Dados do App Registration no Azure Entra ID:')
    console.log('(Azure Portal → Entra ID → App registrations → seu app)\n')
  }

  const clientId     = await resolveEnv('ENTRA_CLIENT_ID',     'Client ID (Application ID): ')
  const clientSecret = await resolveEnv('ENTRA_CLIENT_SECRET', 'Client Secret (Enter para pular): ', true)
  const tenantId     = await resolveEnv('ENTRA_TENANT_ID',     'Tenant ID (Enter para multi-tenant): ')

  if (!clientId) {
    console.error('ENTRA_CLIENT_ID é obrigatório.')
    process.exit(1)
  }

  // 3. Configurar OAuth2 na coleção users (API atual do PocketBase)
  const tenant   = tenantId || 'common'
  const authURL  = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`
  const tokenURL = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`

  const collectionRes = await fetch(`${PB_URL}/api/collections/users`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify({
      oauth2: {
        enabled: true,
        providers: [
          {
            name: 'microsoft',
            clientId,
            ...(clientSecret ? { clientSecret } : {}),
            authURL,
            tokenURL,
          },
        ],
      },
    }),
  })

  if (!collectionRes.ok) {
    const err = await collectionRes.json().catch(() => ({}))
    console.error('\nErro ao configurar OAuth2 na coleção users:', err.message ?? collectionRes.statusText)
    process.exit(1)
  }

  console.log('Microsoft Entra ID configurado com sucesso!\n')
  console.log('Redirect URI a registrar no Azure:')
  console.log('  App registrations → Authentication → Add platform → Web')
  console.log(`  ${PB_URL}/api/oauth2-redirect\n`)
}

main().catch((err) => {
  console.error('Erro:', err.message)
  process.exit(1)
})
