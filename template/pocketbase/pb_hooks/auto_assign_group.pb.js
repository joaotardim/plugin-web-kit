/// <reference path="../pb_data/types.d.ts" />

// Atribui grupo ao novo usuário criado via OAuth2.
// Se ainda não existe nenhum admin, o primeiro usuário vira admin (bootstrap).
// Caso contrário, entra no grupo "users".
// Usa onRecordAfterCreateSuccess + $app.save() porque o createData do OAuth2
// é sobrescrito internamente pelo PocketBase antes do save.
onRecordAfterCreateSuccess((e) => {
  if (e.record.get('group')) { e.next(); return }

  try {
    const adminGroups = $app.findRecordsByFilter('groups', 'name = "admin"', '', 1, 0)
    const usersGroups = $app.findRecordsByFilter('groups', 'name = "users"', '', 1, 0)
    if (!adminGroups.length || !usersGroups.length) { e.next(); return }

    const existingAdmins = $app.findRecordsByFilter(
      'users', 'group = "' + adminGroups[0].id + '"', '', 1, 0
    )
    e.record.set('group', existingAdmins.length === 0 ? adminGroups[0].id : usersGroups[0].id)
    $app.save(e.record)
  } catch (_) {
    // coleção groups ainda não existe — setup pendente
  }

  e.next()
}, 'users')

// Impede que não-admins alterem o campo group de qualquer usuário.
onRecordUpdateRequest((e) => {
  const info = e.requestInfo()

  // Se group não está sendo alterado, não há nada a verificar
  if (info.body['group'] === undefined) { e.next(); return }

  // Superusuário pode tudo
  if (info.hasSuperuserAuth()) { e.next(); return }

  // Verifica se o usuário autenticado é admin
  if (info.auth) {
    try {
      const authGroup = $app.findRecordById('groups', info.auth.get('group'))
      if (authGroup.get('name') === 'admin') { e.next(); return }
    } catch (_) { /* grupo não encontrado — trata como não-admin */ }
  }

  throw new ForbiddenError('Apenas administradores podem alterar o grupo de um usuário.')
}, 'users')
