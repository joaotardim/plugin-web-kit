/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  var collection
  try { collection = app.findCollectionByNameOrId("screens") } catch (_) { return }
  if (!collection) return
  if (collection.fields.getByName("collection")) return

  collection.fields.add(new TextField({
    "id": "text_pb_collection",
    "name": "collection",
    "required": false,
    "system": false,
    "presentable": false,
  }))

  return app.save(collection)
}, (app) => {
  var collection
  try { collection = app.findCollectionByNameOrId("screens") } catch (_) { return }
  if (!collection) return
  collection.fields.removeByName("collection")
  return app.save(collection)
})
