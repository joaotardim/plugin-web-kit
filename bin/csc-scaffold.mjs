#!/usr/bin/env node
/**
 * csc-scaffold — CLI para materializar um projeto novo a partir do template
 * csc-web-kit embutido no plugin. Usa o núcleo em ./lib/scaffold.mjs.
 *
 * A telinha web (csc-setup.mjs) é o caminho recomendado para coletar dados
 * sensíveis. Este CLI existe como fallback de terminal/CI. A senha vem (nesta
 * ordem): variável PB_SUPERUSER_PASSWORD → prompt MASCARADO (TTY) → --password
 * (apenas CI; evite, fica em logs).
 *
 * Uso (a senha é pedida com máscara):
 *   node bin/csc-scaffold.mjs --company fotus --name meu-projeto \
 *     --dest ~/projetos/meu-projeto --email admin@empresa.com
 */
import { createInterface } from 'node:readline'
import { scaffoldProject } from './lib/scaffold.mjs'

// Códigos de controle do terminal (sem bytes literais no fonte).
const ETX = String.fromCharCode(3)    // Ctrl-C
const EOT = String.fromCharCode(4)    // Ctrl-D
const BS = String.fromCharCode(8)     // Backspace
const DEL = String.fromCharCode(127)  // Delete

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

// Prompt de senha com máscara (`*`). Só mascara num TTY real.
function askPassword(prompt) {
  return new Promise((res) => {
    process.stdout.write(prompt)
    const stdin = process.stdin
    if (!stdin.isTTY) {
      const rl = createInterface({ input: stdin })
      rl.once('line', (line) => { rl.close(); res(line.trim()) })
      return
    }
    let pw = ''
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')
    const onData = (char) => {
      if (char === '\n' || char === '\r' || char === EOT) {
        stdin.setRawMode(false); stdin.pause(); stdin.removeListener('data', onData)
        process.stdout.write('\n'); res(pw)
      } else if (char === ETX) {
        process.stdout.write('\n'); process.exit(1)
      } else if (char === DEL || char === BS) {
        if (pw.length > 0) { pw = pw.slice(0, -1); process.stdout.write('\b \b') }
      } else {
        pw += char; process.stdout.write('*')
      }
    }
    stdin.on('data', onData)
  })
}

async function resolvePassword(args) {
  let password = args.password ? String(args.password) : (process.env.PB_SUPERUSER_PASSWORD || '')
  if (password) return password
  if (!process.stdin.isTTY) {
    fail(
      'senha não informada e sem terminal interativo para o prompt mascarado.\n' +
      'Use a telinha web (/web-kit:projeto), rode este comando você mesmo no terminal\n' +
      '(prefixo `!` no Claude Code), ou defina PB_SUPERUSER_PASSWORD no ambiente.',
    )
  }
  while (password.length < 10) {
    password = await askPassword('Senha do superusuário do PocketBase (mín. 10 caracteres): ')
    if (password.length < 10) console.log('Senha muito curta (mín. 10 caracteres).')
  }
  return password
}

const args = parseArgs(process.argv.slice(2))
const password = await resolvePassword(args)

try {
  const { dest } = scaffoldProject({
    company: args.company,
    name: args.name,
    dest: args.dest,
    email: args.email,
    password,
    secret: args.secret,
  })
  console.log('')
  console.log(`✅ Projeto criado em: ${dest}`)
  console.log('')
  console.log('Próximos passos:')
  console.log(`  cd "${dest}"`)
  console.log('  npm install')
  console.log('  npm start')
} catch (err) {
  fail(err instanceof Error ? err.message : String(err))
}
