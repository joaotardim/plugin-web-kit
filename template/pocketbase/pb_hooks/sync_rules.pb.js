/// <reference path="../pb_data/types.d.ts" />

// POST /api/screens/sync-rules
// Sincroniza listRule/viewRule das coleções PocketBase com os grupos configurados
// em /telas. Roda fora de qualquer transação de registro — ao contrário dos hooks
// onRecord*, aqui $app.save(col) tem sua própria transação e não causa rollback.

function buildRule(groups) {
  if (!groups || groups.length === 0) return null
  return groups.map(function(id) {
    return '@request.auth.group = "' + id + '"'
  }).join(' || ')
}

routerAdd('POST', '/api/screens/sync-rules', function(e) {
  var info = e.requestInfo()

  // hasSuperuserAuth() existe em hooks mas não em routerAdd events — checar só auth
  if (!info || !info.auth) {
    throw new UnauthorizedError('Autenticação necessária.')
  }

  var authorized = false
  try {
    var userGroup = $app.findRecordById('groups', info.auth.get('group'))
    authorized = userGroup.getString('name') === 'admin'
  } catch (_) {}

  if (!authorized) {
    throw new ForbiddenError('Apenas administradores podem sincronizar regras.')
  }

  var screens
  try {
    screens = $app.findRecordsByFilter('screens', 'collection != ""', '', 100, 0)
  } catch (_) {
    return e.json(200, { synced: 0 })
  }

  var synced = 0
  for (var i = 0; i < screens.length; i++) {
    var screen = screens[i]
    var collectionName, groups
    try {
      collectionName = screen.getString('collection')
      groups = screen.get('groups') || []
    } catch (_) {
      continue
    }
    if (!collectionName) continue

    if (!Array.isArray(groups)) {
      try { groups = JSON.parse(groups) } catch (_) { groups = [] }
    }

    var rule = buildRule(groups)

    try {
      var col = $app.findCollectionByNameOrId(collectionName)
      col.listRule = rule
      col.viewRule = rule
      $app.save(col)
      synced++
    } catch (err) {
      $app.logger().error('sync_rules: falha ao atualizar "' + collectionName + '": ' + err)
    }
  }

  e.json(200, { synced: synced })
})
