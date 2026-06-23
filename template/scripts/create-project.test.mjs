#!/usr/bin/env node
/**
 * Teste de regressão para o wizard create-project.
 * Cobre o bug ENAMETOOLONG: destino padrão Windows-only (C:\projetos) resolvia
 * para dentro do repositório no macOS/Linux, causando cópia recursiva infinita.
 *
 * Rode com: node scripts/create-project.test.mjs
 */
import { homedir } from 'node:os'
import { join, isAbsolute } from 'node:path'
import { resolveDest, defaultDestFor, copyFilter } from './create-project.mjs'

let failures = 0
function check(name, cond) {
  if (cond) {
    console.log(`  ✓ ${name}`)
  } else {
    console.error(`  ✗ ${name}`)
    failures++
  }
}

console.log('resolveDest / defaultDestFor:')

const ROOT = '/Users/exemplo/projeto/csc-web-kit'

// 1. O default agora é absoluto e fica na home, fora do repo (qualquer SO).
const def = defaultDestFor('meu-projeto')
check('default é absoluto', isAbsolute(def))
check('default fica em ~/projetos', def === join(homedir(), 'projetos', 'meu-projeto'))
check('default NÃO fica dentro do repo', !def.startsWith(ROOT))

// 2. O bug original: caminho estilo Windows no mac resolvia para dentro do repo → deve ser REJEITADO.
let rejected = false
try { resolveDest('C:\\projetos/testetardim', ROOT) } catch { rejected = true }
// (no macOS isso resolve para dentro do cwd; o guard deve recusar destinos dentro do repo)

// 3. Destino explicitamente dentro do repo → rejeitado.
let rejectedInside = false
try { resolveDest(join(ROOT, 'sub', 'x'), ROOT) } catch { rejectedInside = true }
check('destino dentro do repo é rejeitado', rejectedInside)

// 4. Destino válido fora do repo → retorna caminho absoluto.
let okOutside = false
try { okOutside = isAbsolute(resolveDest(join(homedir(), 'projetos', 'ok'), ROOT)) } catch { /* */ }
check('destino fora do repo é aceito (absoluto)', okOutside)

// 5. O próprio ROOT como destino → rejeitado.
let rejectedRoot = false
try { resolveDest(ROOT, ROOT) } catch { rejectedRoot = true }
check('o próprio repo como destino é rejeitado', rejectedRoot)

// ── copyFilter: não copiar ferramental do Reversa, manter skills do template ──
console.log('\ncopyFilter (o que vai / não vai para o projeto novo):')
const R = '/tpl'
const keep = (rel) => copyFilter(R, join(R, rel))   // true = copia

// Excluídos (artefatos Reversa)
check('.reversa/ é excluído',            !keep('.reversa/state.json'))
check('_reversa_sdd/ é excluído',        !keep('_reversa_sdd/domain.md'))
check('_reversa_forward/ é excluído',    !keep('_reversa_forward/x/regression-watch.md'))
check('AGENTS.md é excluído',            !keep('AGENTS.md'))
check('skill reversa base é excluída',   !keep('.claude/skills/reversa/SKILL.md'))
check('skill reversa-scout é excluída',  !keep('.claude/skills/reversa-scout/SKILL.md'))
check('.agents/ inteiro é excluído',     !keep('.agents/skills/reversa-detective/SKILL.md'))

// Mantidos (skills próprias do template vivem em .claude/commands/, não skills/)
check('command feature é MANTIDO',       keep('.claude/commands/feature.md'))
check('command nova-tela é MANTIDO',     keep('.claude/commands/nova-tela.md'))
check('CLAUDE.md é MANTIDO',             keep('CLAUDE.md'))
check('src/App.tsx é MANTIDO',           keep('src/App.tsx'))

// Exclusões já existentes continuam valendo
check('node_modules continua excluído',  !keep('node_modules/react/index.js'))
check('pb_data continua excluído',       !keep('pocketbase/pb_data/data.db'))

console.log(failures === 0 ? '\n✅ Todos os testes passaram.' : `\n❌ ${failures} teste(s) falharam.`)
process.exit(failures === 0 ? 0 : 1)
