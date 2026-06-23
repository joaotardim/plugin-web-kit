/// <reference path="../pb_data/types.d.ts" />

// RF-07 (controle-de-acesso): impede o auto-rebaixamento de um usuário.
// Ninguém pode alterar o PRÓPRIO grupo — a troca de papel deve ser feita por
// OUTRO admin (ou pelo superusuário, que é a rota de recuperação de um admin
// auto-bloqueado). O frontend é apenas UX e contornável via API direta
// (design.md:60); esta é a barreira real. Espelha protect_system_groups.pb.js.
onRecordUpdateRequest(function (e) {
  var info = e.requestInfo()

  // Superusuário pode tudo — rota de recuperação de um admin sem acesso.
  if (info.hasSuperuserAuth()) { e.next(); return }

  // group não está sendo enviado → nada a verificar.
  if (info.body['group'] === undefined) { e.next(); return }

  // Só interessa quando o autenticado é o dono do próprio registro.
  if (!info.auth || info.auth.id !== e.record.id) { e.next(); return }

  // Sem mudança real de grupo (selecionou o mesmo) → deixa passar.
  var currentGroup = e.record.getString('group')
  var newGroup = info.body['group'] || ''
  if (newGroup === currentGroup) { e.next(); return }

  throw new ForbiddenError('Você não pode alterar o seu próprio grupo. Peça a outro administrador.')
}, 'users')
