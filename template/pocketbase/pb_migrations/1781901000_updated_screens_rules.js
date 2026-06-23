/// <reference path="../pb_data/types.d.ts" />

// createRule: null bloqueia REST API mesmo para superusuários.
// Usar regra explícita de admin para permitir sync via REST API com token de superusuário.
migrate((app) => {
  var collection
  try { collection = app.findCollectionByNameOrId("screens") } catch (_) { return }
  if (!collection) return

  unmarshal({
    "createRule": "@request.auth.group.name = \"admin\"",
    "deleteRule": "@request.auth.group.name = \"admin\""
  }, collection)

  return app.save(collection)
}, (app) => {
  var collection
  try { collection = app.findCollectionByNameOrId("screens") } catch (_) { return }
  if (!collection) return

  unmarshal({
    "createRule": null,
    "deleteRule": null
  }, collection)

  return app.save(collection)
})
