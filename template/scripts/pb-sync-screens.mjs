#!/usr/bin/env node
/**
 * Sincroniza src/routes.json com a coleção screens do PocketBase.
 * Cria rotas novas (com grupo admin pré-configurado) e atualiza o campo
 * "collection" quando ele muda. Não remove registros existentes.
 * Idempotente — seguro rodar múltiplas vezes.
 * Uso: npm run pb:sync-screens
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv, authenticateSuperuser } from './_env.mjs'

loadEnv()

const PB_URL = process.env.VITE_POCKETBASE_URL ?? 'http://localhost:8090'
const ROOT   = resolve(dirname(fileURLToPath(import.meta.url)), '..')

async function fetchAdminGroupId(token) {
  const res = await fetch(
    `${PB_URL}/api/collections/groups/records?filter=${encodeURIComponent('name = "admin"')}&perPage=1`,
    { headers: { Authorization: token } },
  )
  if (!res.ok) return null
  const data = await res.json()
  return data.items?.[0]?.id ?? null
}

async function main() {
  if (!process.env.PB_SUPERUSER_EMAIL || !process.env.PB_SUPERUSER_PASSWORD) {
    console.log('pb:sync-screens: credenciais não definidas — pulando.')
    return
  }

  const routesPath = join(ROOT, 'src', 'routes.json')
  if (!existsSync(routesPath)) {
    console.log('pb:sync-screens: src/routes.json não encontrado — pulando.')
    return
  }

  const routes = JSON.parse(readFileSync(routesPath, 'utf8'))
  const token  = await authenticateSuperuser(PB_URL)
  const adminGroupId = await fetchAdminGroupId(token)

  console.log('Sincronizando rotas com PocketBase...')

  let created = 0
  let updated = 0

  for (const route of routes) {
    const filter = `route = "${route.path}"`
    const check  = await fetch(
      `${PB_URL}/api/collections/screens/records?filter=${encodeURIComponent(filter)}&perPage=1`,
      { headers: { Authorization: token } },
    )

    if (!check.ok) {
      console.log('  coleção screens não encontrada — rode pb:setup primeiro.')
      return
    }

    const result = await check.json()
    const routeCollection = route.collection ?? ''

    if (result.totalItems === 0) {
      const createBody = {
        route: route.path,
        name: route.name,
        ...(routeCollection ? { collection: routeCollection } : {}),
      }
      const create = await fetch(`${PB_URL}/api/collections/screens/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify(createBody),
      })

      if (!create.ok) {
        const err = await create.json().catch(() => ({}))
        const detail = err.data ? ` | ${JSON.stringify(err.data)}` : ''
        throw new Error(`Erro ao criar rota ${route.path}: ${err.message ?? create.statusText}${detail}`)
      }

      // Adiciona grupo admin via PATCH separado (groups no create body causa erro no PocketBase)
      let createdRecord = null
      if (adminGroupId) {
        createdRecord = await create.json()
        const groupPatch = await fetch(`${PB_URL}/api/collections/screens/records/${createdRecord.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: token },
          body: JSON.stringify({ groups: [adminGroupId] }),
        })
        if (!groupPatch.ok) {
          console.warn(`  aviso: não foi possível adicionar grupo admin em ${route.path}`)
        }
      }

      // Sincroniza listRule/viewRule da coleção via REST API (hooks causam rollback em transações)
      if (routeCollection && adminGroupId) {
        const rule = `@request.auth.group = "${adminGroupId}"`
        const rulesRes = await fetch(`${PB_URL}/api/collections/${routeCollection}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: token },
          body: JSON.stringify({ listRule: rule, viewRule: rule }),
        }).catch(() => null)
        if (!rulesRes?.ok) {
          console.warn(`  aviso: não foi possível sincronizar regras de ${routeCollection}`)
        }
      }

      console.log(`  + ${route.path}  (${route.name})`)
      created++
    } else {
      const existing = result.items[0]
      if ((existing.collection ?? '') !== routeCollection) {
        const patch = await fetch(`${PB_URL}/api/collections/screens/records/${existing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: token },
          body: JSON.stringify({ collection: routeCollection }),
        })

        if (!patch.ok) {
          const err = await patch.json().catch(() => ({}))
          throw new Error(`Erro ao atualizar rota ${route.path}: ${err.message ?? patch.statusText}`)
        }

        console.log(`  ~ ${route.path}  (collection: ${routeCollection || 'removida'})`)
        updated++
      }
    }
  }

  if (created === 0 && updated === 0) {
    console.log('  Nenhuma alteração.\n')
  } else {
    if (created > 0) console.log(`  ${created} rota(s) criada(s).`)
    if (updated > 0) console.log(`  ${updated} rota(s) atualizada(s).`)
    console.log()
  }
}

main().catch((err) => {
  console.error('pb:sync-screens erro:', err.message)
  process.exitCode = 1
})
