#!/usr/bin/env node
/**
 * Cria ou atualiza o superusuário do PocketBase.
 * Uso: npm run pb:superuser -- <email> <senha>
 */
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT      = join(__dirname, '..')
const IS_WIN    = process.platform === 'win32'
const BINARY    = IS_WIN ? 'pocketbase.exe' : 'pocketbase'
const BIN_PATH  = join(ROOT, 'pocketbase', 'bin', BINARY)
const DATA_DIR  = join(ROOT, 'pocketbase', 'pb_data')

if (!existsSync(BIN_PATH)) {
  console.error('Binário do PocketBase não encontrado.')
  console.error('Execute "npm run pb" primeiro para baixá-lo.\n')
  process.exit(1)
}

const [email, password] = process.argv.slice(2)

if (!email || !password) {
  console.log('Uso:')
  console.log('  npm run pb:superuser -- <email> <senha>\n')
  console.log('Exemplo:')
  console.log('  npm run pb:superuser -- admin@fotus.com.br MinhaSenh@123\n')
  process.exit(1)
}

const result = spawnSync(
  BIN_PATH,
  ['superuser', 'upsert', email, password, `--dir=${DATA_DIR}`],
  { stdio: 'inherit' },
)

process.exit(result.status ?? 0)
