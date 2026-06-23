#!/usr/bin/env node
/**
 * Apaga os artefatos gerados em tempo de execução/build.
 * Uso: npm run reset
 */
import { existsSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const TARGETS = [
  {
    path: join(ROOT, 'pocketbase', 'pb_data'),
    label: 'pocketbase/pb_data',
    desc: 'banco de dados, superusuário e todos os dados do PocketBase',
    always: true,
  },
  {
    path: join(ROOT, 'pocketbase', 'bin'),
    label: 'pocketbase/bin',
    desc: 'binário do PocketBase (será re-baixado no próximo npm start)',
    always: false,
  },
  {
    path: join(ROOT, 'dist'),
    label: 'dist',
    desc: 'build do frontend',
    always: false,
  },
  {
    path: join(ROOT, 'node_modules'),
    label: 'node_modules',
    desc: 'dependências npm (exige npm install depois)',
    always: false,
  },
]

const BOLD  = '\x1b[1m'
const RED   = '\x1b[31m'
const GRAY  = '\x1b[90m'
const RESET = '\x1b[0m'

function ask(prompt) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(prompt, (a) => { rl.close(); resolve(a.trim().toLowerCase()) })
  })
}

const existing = TARGETS.filter((t) => existsSync(t.path))

if (existing.length === 0) {
  console.log('Nada para apagar — o projeto já está limpo.')
  process.exit(0)
}

console.log(`\n${BOLD}O que será apagado:${RESET}\n`)

for (const t of existing) {
  const tag = t.always ? `${RED}[dados]${RESET}` : `${GRAY}[build]${RESET}`
  console.log(`  ${tag} ${BOLD}${t.label}${RESET}`)
  console.log(`       ${t.desc}\n`)
}

const answer = await ask(`Confirma? [s/N] `)

if (answer !== 's') {
  console.log('Cancelado.')
  process.exit(0)
}

console.log('')

let hasError = false

for (const t of existing) {
  try {
    rmSync(t.path, { recursive: true, force: true })
    console.log(`  Removido: ${t.label}`)
  } catch (err) {
    if (err.code === 'EPERM' || err.code === 'EBUSY') {
      console.log(`  ${RED}Ignorado: ${t.label}${RESET}`)
      console.log(`    Arquivo em uso — feche o PocketBase (Ctrl+C no terminal onde está rodando) e repita.\n`)
      hasError = true
    } else {
      throw err
    }
  }
}

if (hasError) {
  console.log('Reset parcial. Corrija os itens acima e rode npm run reset novamente.\n')
} else {
  console.log('\nPronto. Execute npm start para recomeçar.\n')
}
