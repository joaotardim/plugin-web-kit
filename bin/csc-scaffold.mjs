#!/usr/bin/env node
/**
 * csc-scaffold — materializa um projeto novo a partir do template csc-web-kit
 * embutido no plugin web-kit.
 *
 * Versão NÃO-INTERATIVA do wizard `scripts/create-project.mjs`: recebe todas as
 * respostas por flags, para que a skill /web-kit:projeto colete os dados na
 * conversa e chame este script de forma determinística.
 *
 * Uso:
 *   node bin/csc-scaffold.mjs \
 *     --company fotus \
 *     --name meu-projeto \
 *     --dest ~/projetos/meu-projeto \
 *     --email admin@empresa.com \
 *     --password "senhaSegura123" \
 *     [--secret "<entra_client_secret>"]
 *
 * O template é localizado relativo a ESTE arquivo (../template), portanto o
 * script funciona de qualquer diretório de trabalho.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve, isAbsolute, sep } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATE = join(__dirname, '..', 'template')

// ── Parsing de argumentos ───────────────────────────────────────────────────
function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const next = argv[i + 1]
      if (next && !next.startsWith('--')) { out[key] = next; i++ }
      else out[key] = true
    }
  }
  return out
}

function fail(msg) {
  console.error(`Erro: ${msg}`)
  process.exit(1)
}

// Expande ~ para a home do usuário.
function expandHome(p) {
  if (p === '~') return homedir()
  if (p.startsWith('~/') || p.startsWith('~\\')) return join(homedir(), p.slice(2))
  return p
}

function defaultDestFor(projectName) {
  return join(homedir(), 'projetos', projectName)
}

// Impede que o destino caia dentro do template embutido (evita recursão na cópia).
function resolveDest(input) {
  const abs = resolve(expandHome(input))
  const rel = relative(TEMPLATE, abs)
  const insideTemplate = rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
  if (insideTemplate) {
    fail(`destino "${input}" fica dentro do template (${abs}). Escolha uma pasta fora.`)
  }
  return abs
}

// Excludes defensivos — o template já vem limpo, mas garantimos que nada de
// build/dados/binário seja copiado caso o plugin tenha sido usado localmente.
const SKIP = [
  'node_modules', 'pocketbase/pb_data', 'pocketbase/bin', '.git',
  'pocketbase/.oauth-pending.json', 'dist', '.env',
]
function copyFilter(sourcePath) {
  const rel = relative(TEMPLATE, sourcePath).split(sep).join('/')
  return !SKIP.some(s => rel === s || rel.startsWith(s + '/'))
}

function loadCompany(key) {
  const path = join(TEMPLATE, 'scripts', 'companies', `${key}.json`)
  if (!existsSync(path)) {
    fail(`empresa "${key}" não encontrada em template/scripts/companies/. Disponíveis: fotus, litoral.`)
  }
  return JSON.parse(readFileSync(path, 'utf8'))
}

// Aplica a identidade da empresa: package.json, index.html e .env.
function applyCompany(dest, company, projectName, email, password, secret) {
  const pkgPath = join(dest, 'package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  pkg.name = projectName
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

  const htmlPath = join(dest, 'index.html')
  writeFileSync(
    htmlPath,
    readFileSync(htmlPath, 'utf8').replace(/<title>[^<]*<\/title>/, `<title>${company.name}</title>`),
  )

  const envExample = readFileSync(join(dest, '.env.example'), 'utf8')
  writeFileSync(
    join(dest, '.env'),
    envExample
      .replace(/^(VITE_COMPANY=).*$/m, `$1${company.key}`)
      .replace(/^(PB_SUPERUSER_EMAIL=).*$/m, `$1${email}`)
      .replace(/^(PB_SUPERUSER_PASSWORD=).*$/m, `$1${password}`)
      .replace(/^(ENTRA_CLIENT_ID=).*$/m, `$1${company.azure?.clientId ?? ''}`)
      .replace(/^(ENTRA_TENANT_ID=).*$/m, `$1${company.azure?.tenantId ?? ''}`)
      .replace(/^(ENTRA_CLIENT_SECRET=).*$/m, `$1${secret ?? ''}`),
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
const args = parseArgs(process.argv.slice(2))

if (!existsSync(TEMPLATE)) fail(`template não encontrado em ${TEMPLATE}. Plugin corrompido?`)

const companyKey = String(args.company || '').trim()
if (!companyKey) fail('--company é obrigatório (fotus | litoral).')
const company = loadCompany(companyKey)

const projectName = String(args.name || `mvp-${companyKey}`).trim()
const email = String(args.email || '').trim()
if (!email.includes('@') || !email.includes('.')) fail('--email inválido.')
const password = String(args.password || '')
if (password.length < 10) fail('--password deve ter no mínimo 10 caracteres.')
const secret = args.secret ? String(args.secret) : ''

const dest = resolveDest(args.dest || defaultDestFor(projectName))

console.log('───────────────────────────────────────────────')
console.log(`  Empresa:  ${company.name} (${company.key})`)
console.log(`  Projeto:  ${projectName}`)
console.log(`  Destino:  ${dest}`)
console.log(`  Admin:    ${email}`)
console.log('───────────────────────────────────────────────')

if (existsSync(dest)) {
  console.log('Atenção: a pasta já existe — os arquivos serão sobrescritos.')
}

console.log('Copiando template...')
mkdirSync(dest, { recursive: true })
cpSync(TEMPLATE, dest, { recursive: true, filter: copyFilter })

console.log('Aplicando identidade da empresa...')
applyCompany(dest, company, projectName, email, password, secret)

// Garante que pb_data existe para o PocketBase iniciar.
mkdirSync(join(dest, 'pocketbase', 'pb_data'), { recursive: true })

console.log('Inicializando repositório git...')
const git = spawnSync('git', ['init'], { cwd: dest, stdio: 'inherit' })
if (git.status !== 0) console.log('Aviso: git init falhou — configure o repositório manualmente.')

console.log('')
console.log(`✅ Projeto criado em: ${dest}`)
console.log('')
console.log('Próximos passos:')
console.log(`  cd "${dest}"`)
console.log('  npm install')
console.log('  npm start')
