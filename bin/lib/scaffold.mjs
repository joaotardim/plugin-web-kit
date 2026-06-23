/**
 * Núcleo de scaffold compartilhado entre o CLI (csc-scaffold.mjs) e a telinha
 * web (csc-setup.mjs). Não chama process.exit nem faz I/O de terminal — valida
 * via throw, para que o chamador trate o erro como quiser (CLI imprime, web
 * responde 400).
 */
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve, isAbsolute, sep } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const TEMPLATE = join(__dirname, '..', '..', 'template')

export function expandHome(p) {
  if (p === '~') return homedir()
  if (p.startsWith('~/') || p.startsWith('~\\')) return join(homedir(), p.slice(2))
  return p
}

export function defaultDestFor(projectName) {
  return join(homedir(), 'projetos', projectName)
}

// Impede que o destino caia dentro do template embutido (evita recursão na cópia).
export function resolveDest(input) {
  const abs = resolve(expandHome(input))
  const rel = relative(TEMPLATE, abs)
  const insideTemplate = rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
  if (insideTemplate) {
    throw new Error(`destino "${input}" fica dentro do template. Escolha uma pasta fora (${abs}).`)
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

// Lista as empresas disponíveis a partir de template/scripts/companies/*.json.
export function listCompanies() {
  const dir = join(TEMPLATE, 'scripts', 'companies')
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try {
        const c = JSON.parse(readFileSync(join(dir, f), 'utf8'))
        return { key: c.key, name: c.name }
      } catch { return null }
    })
    .filter(Boolean)
}

export function loadCompany(key) {
  const path = join(TEMPLATE, 'scripts', 'companies', `${key}.json`)
  if (!existsSync(path)) {
    throw new Error(`empresa "${key}" não encontrada. Disponíveis: ${listCompanies().map(c => c.key).join(', ')}.`)
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

/**
 * Cria o projeto a partir do template. Valida via throw.
 * @returns {{ dest: string, projectName: string, company: object }}
 */
export function scaffoldProject({ company: companyKey, name, dest, email, password, secret }) {
  if (!existsSync(TEMPLATE)) throw new Error(`template não encontrado em ${TEMPLATE}. Plugin corrompido?`)
  const key = String(companyKey || '').trim()
  if (!key) throw new Error('empresa é obrigatória (ex.: fotus, litoral).')
  const company = loadCompany(key)

  const projectName = String(name || `mvp-${key}`).trim()
  const mail = String(email || '').trim()
  if (!mail.includes('@') || !mail.includes('.')) throw new Error('e-mail inválido.')
  const pass = String(password || '')
  if (pass.length < 10) throw new Error('senha deve ter no mínimo 10 caracteres.')
  const absDest = resolveDest(dest || defaultDestFor(projectName))

  mkdirSync(absDest, { recursive: true })
  cpSync(TEMPLATE, absDest, { recursive: true, filter: copyFilter })
  applyCompany(absDest, company, projectName, mail, pass, secret ? String(secret) : '')
  mkdirSync(join(absDest, 'pocketbase', 'pb_data'), { recursive: true })
  spawnSync('git', ['init'], { cwd: absDest, stdio: 'ignore' })

  return { dest: absDest, projectName, company }
}
