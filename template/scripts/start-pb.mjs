#!/usr/bin/env node
/**
 * Baixa o binário do PocketBase na primeira execução e inicia o servidor.
 * Com --setup: executa apenas download + criação do superusuário, depois sai.
 * Não requer Docker. Requer apenas Node.js 18+.
 */
import { existsSync, mkdirSync, writeFileSync, chmodSync, readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn, spawnSync } from 'node:child_process'
import { inflateRaw } from 'node:zlib'
import { promisify } from 'node:util'
import { createInterface } from 'node:readline'
import { loadEnv } from './_env.mjs'

loadEnv()

const inflateRawAsync = promisify(inflateRaw)

const __dirname    = dirname(fileURLToPath(import.meta.url))
const ROOT         = join(__dirname, '..')
const BIN_DIR      = join(ROOT, 'pocketbase', 'bin')
const DATA_DIR     = join(ROOT, 'pocketbase', 'pb_data')
const HOOKS_DIR    = join(ROOT, 'pocketbase', 'pb_hooks')
const MIGRATIONS_DIR = join(ROOT, 'pocketbase', 'pb_migrations')

const IS_WIN     = process.platform === 'win32'
const BINARY     = IS_WIN ? 'pocketbase.exe' : 'pocketbase'
const BINARY_PATH = join(BIN_DIR, BINARY)

const OS_MAP   = { win32: 'windows', darwin: 'darwin', linux: 'linux' }
const ARCH_MAP = { x64: 'amd64', arm64: 'arm64', arm: 'armv7' }

// ── Download ──────────────────────────────────────────────────────────────────

async function getLatestVersion() {
  const res = await fetch(
    'https://api.github.com/repos/pocketbase/pocketbase/releases/latest',
    { headers: { 'User-Agent': 'csc-web-kit' } },
  )
  if (!res.ok) throw new Error(`GitHub API retornou ${res.status}`)
  const data = await res.json()
  return data.tag_name.replace(/^v/, '')
}

async function extractBinaryFromZip(zipBuffer, binaryName, destPath) {
  const EOCD_SIG = 0x06054b50
  const CD_SIG   = 0x02014b50

  let eocdOffset = -1
  for (let i = zipBuffer.length - 22; i >= 0; i--) {
    if (zipBuffer.readUInt32LE(i) === EOCD_SIG) { eocdOffset = i; break }
  }
  if (eocdOffset === -1) throw new Error('ZIP inválido: EOCD não encontrado')

  const cdOffset = zipBuffer.readUInt32LE(eocdOffset + 16)
  const cdSize   = zipBuffer.readUInt32LE(eocdOffset + 12)

  let offset = cdOffset
  while (offset < cdOffset + cdSize) {
    if (zipBuffer.readUInt32LE(offset) !== CD_SIG) break

    const method         = zipBuffer.readUInt16LE(offset + 10)
    const compressedSize = zipBuffer.readUInt32LE(offset + 20)
    const fnLen          = zipBuffer.readUInt16LE(offset + 28)
    const extraLen       = zipBuffer.readUInt16LE(offset + 30)
    const commentLen     = zipBuffer.readUInt16LE(offset + 32)
    const lhOffset       = zipBuffer.readUInt32LE(offset + 42)
    const name           = zipBuffer.toString('utf8', offset + 46, offset + 46 + fnLen)

    if (name === binaryName) {
      const lfhFnLen    = zipBuffer.readUInt16LE(lhOffset + 26)
      const lfhExtraLen = zipBuffer.readUInt16LE(lhOffset + 28)
      const dataStart   = lhOffset + 30 + lfhFnLen + lfhExtraLen
      const compressed  = zipBuffer.subarray(dataStart, dataStart + compressedSize)

      const data =
        method === 0 ? compressed :
        method === 8 ? await inflateRawAsync(compressed) :
        (() => { throw new Error(`Método de compressão não suportado: ${method}`) })()

      writeFileSync(destPath, data)
      return
    }

    offset += 46 + fnLen + extraLen + commentLen
  }

  throw new Error(`Arquivo '${binaryName}' não encontrado no ZIP`)
}

async function downloadAndExtract(version) {
  const os   = OS_MAP[process.platform] ?? 'linux'
  const arch = ARCH_MAP[process.arch] ?? 'amd64'
  const filename = `pocketbase_${version}_${os}_${arch}.zip`
  const url = `https://github.com/pocketbase/pocketbase/releases/download/v${version}/${filename}`

  console.log(`\nBaixando PocketBase v${version} (${os}/${arch})...`)

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Falha no download: ${res.status} ${res.statusText}`)

  const zipBuffer = Buffer.from(await res.arrayBuffer())

  mkdirSync(BIN_DIR, { recursive: true })
  await extractBinaryFromZip(zipBuffer, BINARY, BINARY_PATH)

  if (!IS_WIN) chmodSync(BINARY_PATH, 0o755)

  console.log('PocketBase instalado em pocketbase/bin/\n')
}

// ── Prompts interativos ───────────────────────────────────────────────────────

function askLine(prompt) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => { rl.close(); resolve(answer.trim()) })
  })
}

function askPassword(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt)

    if (!process.stdin.isTTY) {
      const rl = createInterface({ input: process.stdin })
      rl.once('line', (line) => { rl.close(); resolve(line.trim()) })
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
        process.stdout.write('\n')
        process.exit(0)
      } else if (char === '' || char === '\b') {
        if (pw.length > 0) { pw = pw.slice(0, -1); process.stdout.write('\b \b') }
      } else {
        pw += char
        process.stdout.write('*')
      }
    }

    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', onData)
  })
}

async function createSuperuser() {
  let email    = process.env.PB_SUPERUSER_EMAIL
  let password = process.env.PB_SUPERUSER_PASSWORD

  if (email && password) {
    console.log(`Sincronizando superusuário: ${email}`)
  } else {
    console.log('Configuração inicial — crie o superusuário do PocketBase')
    console.log('─'.repeat(55))

    while (!email || !email.includes('@') || !email.includes('.')) {
      email = await askLine('Email: ')
      if (!email.includes('@') || !email.includes('.')) console.log('Email inválido, tente novamente.')
    }

    while (!password || password.length < 10) {
      password = await askPassword('Senha (mín. 10 caracteres): ')
      if (password.length < 10) console.log('Senha muito curta, tente novamente.')
    }
  }

  const result = spawnSync(
    BINARY_PATH,
    ['superuser', 'upsert', email, password, `--dir=${DATA_DIR}`],
    { stdio: 'inherit' },
  )

  if (result.status !== 0) process.exit(result.status ?? 1)

  if (!process.env.PB_SUPERUSER_EMAIL) {
    console.log('\nSuperusuário criado com sucesso! Guarde bem o email e a senha.\n')
  }

  return { email, password }
}

async function collectOAuthConfig() {
  if (!process.env.ENTRA_CLIENT_ID) return null
  return {
    clientId:     process.env.ENTRA_CLIENT_ID,
    clientSecret: process.env.ENTRA_CLIENT_SECRET ?? '',
    tenantId:     process.env.ENTRA_TENANT_ID     ?? '',
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const setupOnly = process.argv.includes('--setup')

  if (!existsSync(BINARY_PATH)) {
    const version = await getLatestVersion()
    await downloadAndExtract(version)
  }

  for (const dir of [DATA_DIR, HOOKS_DIR, MIGRATIONS_DIR]) {
    mkdirSync(dir, { recursive: true })
  }

  const isFirstRun  = !existsSync(join(DATA_DIR, 'data.db'))
  const hasEnvCreds = Boolean(process.env.PB_SUPERUSER_EMAIL && process.env.PB_SUPERUSER_PASSWORD)

  // Cria o superusuário no primeiro run e, na fase de setup (`--setup`) quando há
  // credenciais no .env, re-sincroniza via `superuser upsert` (idempotente). Isso
  // garante que o superusuário do banco SEMPRE corresponda ao .env — sem isso,
  // qualquer divergência (.env editado, pb_data herdado de outra máquina) quebra
  // o pb:setup e o pb:sync-screens com "Failed to authenticate".
  if (isFirstRun || (hasEnvCreds && setupOnly)) {
    const { email, password } = await createSuperuser()

    // OAuth só é agendado no primeiro run, para não reconfigurar a cada start.
    if (isFirstRun) {
      const oauth = await collectOAuthConfig()
      if (oauth) {
        const pendingPath = join(ROOT, 'pocketbase', '.oauth-pending.json')
        writeFileSync(pendingPath, JSON.stringify({ superuserEmail: email, superuserPassword: password, ...oauth }))
        console.log('OAuth será configurado automaticamente quando o PocketBase iniciar.\n')
      }
    }
  }

  if (setupOnly) return

  console.log('PocketBase iniciando em http://localhost:8090')
  console.log('Admin UI → http://localhost:8090/_/\n')

  const pb = spawn(
    BINARY_PATH,
    [
      'serve',
      `--dir=${DATA_DIR}`,
      `--hooksDir=${HOOKS_DIR}`,
      `--migrationsDir=${MIGRATIONS_DIR}`,
      '--http=127.0.0.1:8090',
    ],
    { stdio: 'inherit' },
  )

  pb.on('exit', (code) => process.exit(code ?? 0))
  process.on('SIGINT', () => pb.kill('SIGINT'))
  process.on('SIGTERM', () => pb.kill('SIGTERM'))
}

main().catch((err) => {
  console.error('Erro:', err.message)
  process.exit(1)
})
