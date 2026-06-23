#!/usr/bin/env node
/**
 * Teste do hook prevent_self_demotion.pb.js (RF-07 — controle-de-acesso).
 *
 * Bug: um admin conseguia trocar o PRÓPRIO grupo (admin → users) em /usuarios e
 * se auto-bloqueava. A trava de verdade vive no PocketBase (o frontend é só UX,
 * contornável via API — design.md:60). Este hook recusa qualquer alteração do
 * próprio grupo; só OUTRO admin (ou o superusuário, p/ recuperação) pode mudar.
 *
 * Estratégia: carrega o código REAL do hook em Node, injeta os globais do PB
 * (onRecordUpdateRequest, ForbiddenError) e exercita o handler com eventos
 * mockados — testa o hook de fato, sem subir o PocketBase.
 *
 * Rode com: node scripts/prevent-self-demotion.test.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const HOOK_PATH = join(__dirname, '..', 'pocketbase', 'pb_hooks', 'prevent_self_demotion.pb.js')

class ForbiddenError extends Error {
  constructor(message) { super(message); this.name = 'ForbiddenError' }
}

// Carrega o hook real e devolve o handler registrado em onRecordUpdateRequest.
function loadHandler() {
  const src = readFileSync(HOOK_PATH, 'utf8')
  let handler = null
  const onRecordUpdateRequest = (fn) => { handler = fn }
  const factory = new Function('onRecordUpdateRequest', 'ForbiddenError', src)
  factory(onRecordUpdateRequest, ForbiddenError)
  if (typeof handler !== 'function') {
    throw new Error('hook não registrou onRecordUpdateRequest')
  }
  return handler
}

// Evento PocketBase mockado para onRecordUpdateRequest('users').
// e.record guarda os valores ORIGINAIS (como em protect_system_groups.pb.js);
// info.body traz os valores propostos na requisição.
function makeEvent({ superuser = false, authId = null, recordId = 'u1', body = {}, currentGroup = '' }) {
  const state = { nexted: false }
  const event = {
    record: {
      id: recordId,
      getString: (k) => (k === 'group' ? (currentGroup ?? '') : ''),
    },
    requestInfo: () => ({
      hasSuperuserAuth: () => superuser,
      auth: authId ? { id: authId, get: (k) => (k === 'id' ? authId : undefined) } : null,
      body,
    }),
    next: () => { state.nexted = true },
  }
  return { event, state }
}

// Roda o handler e classifica: bloqueado (ForbiddenError) ou passou (next()).
function run(opts) {
  const { event, state } = makeEvent(opts)
  try {
    loadHandler()(event)
    return { blocked: false, nexted: state.nexted }
  } catch (err) {
    return { blocked: err instanceof ForbiddenError, error: err, nexted: state.nexted }
  }
}

let failures = 0
function check(name, cond) {
  if (cond) { console.log(`  ✓ ${name}`) }
  else { console.error(`  ✗ ${name}`); failures++ }
}

console.log('prevent_self_demotion (hook PocketBase):')

// BLOQUEIA — auto-rebaixamento
check('auto-rebaixar o próprio grupo (admin→users) é bloqueado',
  run({ authId: 'u1', recordId: 'u1', body: { group: 'gUsers' }, currentGroup: 'gAdmin' }).blocked === true)

check('remover o próprio grupo (group:null) é bloqueado',
  run({ authId: 'u1', recordId: 'u1', body: { group: null }, currentGroup: 'gAdmin' }).blocked === true)

// PASSA — casos legítimos
check('update do próprio registro sem tocar em group passa',
  run({ authId: 'u1', recordId: 'u1', body: { name: 'Novo Nome' }, currentGroup: 'gAdmin' }).nexted === true)

check('selecionar o mesmo grupo (no-op) passa',
  run({ authId: 'u1', recordId: 'u1', body: { group: 'gAdmin' }, currentGroup: 'gAdmin' }).nexted === true)

check('admin alterando o grupo de OUTRO usuário passa',
  run({ authId: 'admin1', recordId: 'u2', body: { group: 'gUsers' }, currentGroup: 'gAdmin' }).nexted === true)

check('superusuário alterando (rota de recuperação) passa',
  run({ superuser: true, authId: 'u1', recordId: 'u1', body: { group: 'gUsers' }, currentGroup: 'gAdmin' }).nexted === true)

check('requisição sem auth não é tratada por este hook (passa)',
  run({ authId: null, recordId: 'u1', body: { group: 'gUsers' }, currentGroup: 'gAdmin' }).nexted === true)

console.log(failures === 0 ? '\n✅ Todos os testes passaram.' : `\n❌ ${failures} teste(s) falharam.`)
process.exit(failures === 0 ? 0 : 1)
