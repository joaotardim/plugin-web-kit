/// <reference path="../pb_data/types.d.ts" />

// Impede que grupos de sistema tenham o nome alterado.
// As regras de todas as coleções e outros hooks dependem dos nomes "admin" e "users".
var SYSTEM_GROUPS = ['admin', 'users']

onRecordUpdateRequest(function(e) {
  var info = e.requestInfo()
  if (info.hasSuperuserAuth()) { e.next(); return }

  var newName = info.body['name']
  if (newName === undefined) { e.next(); return }

  var currentName = e.record.getString('name')
  if (!SYSTEM_GROUPS.includes(currentName)) { e.next(); return }

  if (newName !== currentName) {
    throw new ForbiddenError('O nome do grupo "' + currentName + '" não pode ser alterado.')
  }

  e.next()
}, 'groups')
