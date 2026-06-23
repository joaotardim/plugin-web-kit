#!/usr/bin/env node
/**
 * Sobe PocketBase e Vite em paralelo.
 * Suprime o output bruto e exibe apenas o resumo tratado.
 * Em caso de erro, imprime as últimas linhas capturadas para diagnóstico.
 * Uso: npm start
 */
import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from './_env.mjs'

loadEnv()

// Primeiro start no template: VITE_COMPANY não definido → wizard de criação de projeto
if (!process.env.VITE_COMPANY) {
  const init = spawnSync(
    process.execPath,
    [join(dirname(fileURLToPath(import.meta.url)), 'create-project.mjs')],
    { cwd: join(dirname(fileURLToPath(import.meta.url)), '..'), stdio: 'inherit' },
  )
  process.exit(init.status ?? 0)
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT   = join(__dirname, '..')
const IS_WIN = process.platform === 'win32'

const RESET = '\x1b[0m'
const BOLD  = '\x1b[1m'
const CYAN  = '\x1b[36m'
const MAG   = '\x1b[35m'
const RED   = '\x1b[31m'
const GRAY  = '\x1b[90m'
const GREEN = '\x1b[32m'

// Invoca um comando via shell nativo sem usar a opção shell:true do Node
// (evita o aviso DEP0190)
function sh(cmd)   { return IS_WIN ? ['cmd.exe', ['/c', cmd]]  : ['sh', ['-c', cmd]] }
function shSync(cmd, opts) {
  const [bin, args] = sh(cmd)
  return spawnSync(bin, args, opts)
}

function tag(label, color) {
  return `${color}${BOLD}[${label}]${RESET}`
}

// Retira códigos ANSI de uma string
function stripAnsi(s) { return s.replace(/\x1b\[[0-9;]*m/g, '') }

const OAUTH_PENDING       = join(ROOT, 'pocketbase', '.oauth-pending.json')
const CONFIGURED_SENTINEL = join(ROOT, 'pocketbase', 'pb_data', '.configured')
const ROUTES_HASH_FILE    = join(ROOT, 'pocketbase', 'pb_data', '.routes-hash')
const ROUTES_JSON         = join(ROOT, 'src', 'routes.json')

const procs = []
const ready = { pocketbase: false, vite: false }
let pbUrl   = 'http://localhost:8090'
let viteUrl = 'http://localhost:5173'

// Executa um script Node.js e retorna Promise<void>.
// Saída é herdada (stdio: inherit) para aparecer no terminal.
// Rejeita se o processo sair com código != 0.
function runScript(scriptPath, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      process.execPath,
      [join(ROOT, scriptPath)],
      { cwd: ROOT, env: { ...process.env, ...extraEnv }, stdio: 'inherit' },
    )
    proc.on('exit', (code) => {
      if (code !== 0 && code !== null) reject(new Error(`${scriptPath} saiu com código ${code}`))
      else resolve()
    })
  })
}

// Após o PocketBase estar pronto: setup → oauth (se necessário) → sync-screens.
async function runPostStart() {
  // Credenciais podem vir do arquivo pendente (1º start interativo sem .env)
  // ou diretamente das vars de ambiente carregadas pelo loadEnv() acima.
  let baseEnv = {}
  let oauthConfig = null
  if (existsSync(OAUTH_PENDING)) {
    try {
      oauthConfig = JSON.parse(readFileSync(OAUTH_PENDING, 'utf8'))
      baseEnv = {
        PB_SUPERUSER_EMAIL:    oauthConfig.superuserEmail,
        PB_SUPERUSER_PASSWORD: oauthConfig.superuserPassword,
      }
    } catch { /* ignorar erro de parse */ }
  }

  let setupRan = false
  if (!existsSync(CONFIGURED_SENTINEL)) {
    setupRan = true
    await runScript('scripts/pb-setup.mjs', baseEnv)
    try { writeFileSync(CONFIGURED_SENTINEL, '') } catch { /* ignorar */ }
  }

  // Roda OAuth se: há arquivo pendente (1º install interativo)
  // OU setup acabou de rodar E ENTRA_CLIENT_ID está disponível no ambiente.
  const needsOAuth = oauthConfig || (setupRan && process.env.ENTRA_CLIENT_ID)
  if (needsOAuth) {
    const oauthEnv = oauthConfig
      ? {
          ...baseEnv,
          ENTRA_CLIENT_ID:     oauthConfig.clientId,
          ENTRA_CLIENT_SECRET: oauthConfig.clientSecret ?? '',
          ENTRA_TENANT_ID:     oauthConfig.tenantId     ?? '',
        }
      : {} // pb-oauth.mjs carrega as vars diretamente do .env via loadEnv()
    try {
      await runScript('scripts/pb-oauth.mjs', oauthEnv)
      if (oauthConfig) try { unlinkSync(OAUTH_PENDING) } catch { /* ignorar */ }
    } catch (err) {
      process.stderr.write(`  ${tag('oauth', RED)} Erro na configuração OAuth: ${err.message}\n`)
    }
  }

  const routesNeedSync = (() => {
    if (!existsSync(ROUTES_JSON)) return false
    if (!existsSync(ROUTES_HASH_FILE)) return true
    const current = createHash('md5').update(readFileSync(ROUTES_JSON)).digest('hex')
    return current !== readFileSync(ROUTES_HASH_FILE, 'utf8').trim()
  })()

  if (routesNeedSync) {
    await runScript('scripts/pb-sync-screens.mjs', baseEnv)
    try {
      const hash = createHash('md5').update(readFileSync(ROUTES_JSON)).digest('hex')
      writeFileSync(ROUTES_HASH_FILE, hash)
    } catch { /* ignorar */ }
  }

  process.stdout.write(`  ${tag('pocketbase', CYAN)} pronto\n`)
  ready.pocketbase = true
  tryPrintSummary()
}

function tryPrintSummary() {
  if (!ready.pocketbase || !ready.vite) return
  process.stdout.write(
    `\n${GREEN}${BOLD}Tudo pronto!${RESET}\n` +
    `  ${GRAY}Projeto${RESET}     ${ROOT}\n` +
    `  ${CYAN}${BOLD}Admin UI${RESET}    ${pbUrl}/_/\n` +
    `  ${MAG}${BOLD}Vite${RESET}        ${viteUrl}\n\n`,
  )
}

function start(label, color, cmd, args, { readyPattern, onReady } = {}) {
  const proc = spawn(cmd, args, {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const log = []
  let buf     = ''   // texto acumulado — necessário quando o padrão
  let matched = false //  chega em chunks separados

  const collect = (chunk) => {
    const text = chunk.toString()
    buf += text

    for (const line of stripAnsi(text).trimEnd().split('\n')) {
      if (!line.trim()) continue
      if (log.length >= 50) log.shift()
      log.push(line)
    }

    if (!matched && readyPattern?.test(stripAnsi(buf))) {
      matched = true
      onReady?.(stripAnsi(buf))
    }
  }

  proc.stdout?.on('data', collect)
  proc.stderr?.on('data', collect)
  procs.push(proc)

  proc.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      process.stderr.write(`\n${tag(label, RED)} encerrou com código ${code}.\n\n`)
      log.forEach((l) => process.stderr.write(`  ${GRAY}${l}${RESET}\n`))
      process.stderr.write('\n')
      shutdown(1)
    }
  })
}

function shutdown(code = 0) {
  procs.forEach((p) => { try { if (!p.killed) p.kill() } catch { /* ignorar */ } })
  process.exit(code)
}

process.on('SIGINT',  () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

// ── Fase de setup (bloqueante, com acesso ao terminal) ────────────────────────

process.stdout.write(`${GRAY}Verificando ambiente...${RESET}\n\n`)

if (!existsSync(join(ROOT, 'node_modules'))) {
  process.stdout.write(`${GRAY}node_modules não encontrado. Rodando npm install...${RESET}\n\n`)
  const r = shSync('npm install', { cwd: ROOT, stdio: 'inherit' })
  if (r.status !== 0) process.exit(r.status ?? 1)
  process.stdout.write('\n')
}

const setup = spawnSync(
  process.execPath,
  [join(ROOT, 'scripts/start-pb.mjs'), '--setup'],
  { cwd: ROOT, stdio: 'inherit' },
)
if (setup.status !== 0) process.exit(setup.status ?? 1)

// ── Processos em paralelo ─────────────────────────────────────────────────────

process.stdout.write(`\n${GRAY}Iniciando serviços...${RESET}\n\n`)

start(
  'pocketbase', CYAN,
  process.execPath, [join(ROOT, 'scripts/start-pb.mjs')],
  {
    readyPattern: /Server started at/,
    onReady(text) {
      const m = text.match(/Server started at (\S+)/)
      if (m) pbUrl = m[1].replace('0.0.0.0', 'localhost').replace('127.0.0.1', 'localhost')
      runPostStart().catch(err => {
        process.stderr.write(`  ${tag('setup', RED)} Falha no setup: ${err.message}\n`)
      })
    },
  },
)

const [viteCmd, viteArgs] = sh('npm run dev')
start(
  'vite', MAG,
  viteCmd, viteArgs,
  {
    // "ready in" aparece antes; "Local:" pode chegar num chunk posterior —
    // o buffer acumulado garante que o match funciona nos dois casos
    readyPattern: /Local:\s+https?:\/\//,
    onReady(text) {
      const m = text.match(/Local:\s+(https?:\/\/\S+)/)
      if (m) viteUrl = m[1]
      process.stdout.write(`  ${tag('vite', MAG)} pronto\n`)
      ready.vite = true
      tryPrintSummary()
    },
  },
)
