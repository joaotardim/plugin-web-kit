#!/usr/bin/env node
/**
 * Cria as coleções de autorização (groups, screens) e configura os dados iniciais.
 * Idempotente — seguro rodar múltiplas vezes.
 * Uso: npm run pb:setup
 */
import { loadEnv, authenticateSuperuser } from './_env.mjs'

loadEnv()

const PB_URL = process.env.VITE_POCKETBASE_URL ?? 'http://localhost:8090'

async function getCollection(token, name) {
  const res = await fetch(`${PB_URL}/api/collections/${name}`, {
    headers: { Authorization: token },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Erro ao buscar coleção ${name}`)
  return await res.json()
}

async function ensureCollection(token, schema) {
  const existing = await getCollection(token, schema.name)
  if (existing) return existing

  console.log(`  Criando coleção: ${schema.name}`)
  const res = await fetch(`${PB_URL}/api/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify(schema),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Erro ao criar coleção ${schema.name}: ${err.message ?? res.statusText}`)
  }
  return await res.json()
}

async function ensureFieldOnUsers(token, field) {
  const col = await getCollection(token, 'users')
  if (col.fields.some(f => f.name === field.name)) return

  console.log(`  Adicionando campo "${field.name}" em users`)
  const customFields = col.fields.filter(f => !f.system)
  const res = await fetch(`${PB_URL}/api/collections/users`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify({ fields: [...customFields, field] }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Erro ao adicionar campo em users: ${err.message ?? res.statusText}`)
  }
}

async function ensureFieldOnScreens(token, field) {
  const col = await getCollection(token, 'screens')
  if (!col || col.fields.some(f => f.name === field.name)) return

  console.log(`  Adicionando campo "${field.name}" em screens`)
  const customFields = col.fields.filter(f => !f.system)
  const res = await fetch(`${PB_URL}/api/collections/screens`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify({ fields: [...customFields, field] }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Erro ao adicionar campo em screens: ${err.message ?? res.statusText}`)
  }
}

async function configureRules(token) {
  const rules = [
    {
      name: 'groups',
      listRule:   '@request.auth.id != ""',
      viewRule:   '@request.auth.id != ""',
      createRule: '@request.auth.group.name = "admin"',
      updateRule: '@request.auth.group.name = "admin"',
      deleteRule: '@request.auth.group.name = "admin"',
    },
    {
      name: 'screens',
      listRule:   '@request.auth.id != ""',
      viewRule:   '@request.auth.id != ""',
      createRule: '@request.auth.group.name = "admin"',
      updateRule: '@request.auth.group.name = "admin"',
      deleteRule: '@request.auth.group.name = "admin"',
    },
    {
      name: 'users',
      listRule:   '@request.auth.group.name = "admin"',
      viewRule:   'id = @request.auth.id || @request.auth.group.name = "admin"',
      updateRule: 'id = @request.auth.id || @request.auth.group.name = "admin"',
    },
  ]

  for (const { name, ...patch } of rules) {
    const res = await fetch(`${PB_URL}/api/collections/${name}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify(patch),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`Erro ao definir regras de ${name}: ${err.message ?? res.statusText}`)
    }
  }
  console.log('  Regras de segurança aplicadas.')
}

async function ensureRecord(token, collection, filter, data) {
  const res = await fetch(
    `${PB_URL}/api/collections/${collection}/records?filter=${encodeURIComponent(filter)}&perPage=1`,
    { headers: { Authorization: token } },
  )
  if (!res.ok) throw new Error(`Erro ao buscar registro em ${collection}`)
  const result = await res.json()
  if (result.totalItems > 0) return result.items[0]

  console.log(`  Criando registro em ${collection}: ${JSON.stringify(data)}`)
  const create = await fetch(`${PB_URL}/api/collections/${collection}/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify(data),
  })
  if (!create.ok) {
    const err = await create.json().catch(() => ({}))
    throw new Error(`Erro ao criar registro em ${collection}: ${err.message ?? create.statusText}`)
  }
  return await create.json()
}

async function main() {
  if (!process.env.PB_SUPERUSER_EMAIL || !process.env.PB_SUPERUSER_PASSWORD) {
    console.log('pb:setup: credenciais não definidas — pulando.')
    return
  }

  console.log('Configurando coleções de autorização...')
  const token = await authenticateSuperuser(PB_URL)

  // 1. groups
  const groupsCol = await ensureCollection(token, {
    name: 'groups',
    type: 'base',
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { type: 'text', name: 'name',        required: true  },
      { type: 'text', name: 'description', required: false },
    ],
  })

  // 2. screens (com relação para groups)
  await ensureCollection(token, {
    name: 'screens',
    type: 'base',
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.group.name = "admin"',
    updateRule: '@request.auth.group.name = "admin"',
    deleteRule: '@request.auth.group.name = "admin"',
    fields: [
      { type: 'text', name: 'route',      required: true  },
      { type: 'text', name: 'name',       required: true  },
      { type: 'text', name: 'collection', required: false },
      {
        type: 'relation',
        name: 'groups',
        collectionId: groupsCol.id,
        cascadeDelete: false,
        minSelect: null,
        maxSelect: null,
        required: false,
      },
    ],
  })

  // Garante campo collection em bancos existentes criados antes dessa versão
  await ensureFieldOnScreens(token, { type: 'text', name: 'collection', required: false })

  // 3. Campo group em users
  await ensureFieldOnUsers(token, {
    type: 'relation',
    name: 'group',
    collectionId: groupsCol.id,
    cascadeDelete: false,
    minSelect: null,
    maxSelect: 1,
    required: false,
  })

  // 4. Grupos padrão
  await ensureRecord(token, 'groups', 'name = "admin"', {
    name: 'admin',
    description: 'Administradores',
  })
  await ensureRecord(token, 'groups', 'name = "users"', {
    name: 'users',
    description: 'Usuários padrão',
  })

  // 5. Regras de acesso (sempre reaplicadas para garantir consistência)
  await configureRules(token)

  console.log('Pronto.\n')
}

main().catch((err) => {
  console.error('pb:setup erro:', err.message)
  process.exitCode = 1
})
