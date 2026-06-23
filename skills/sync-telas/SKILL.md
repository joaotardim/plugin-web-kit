---
name: sync-telas
description: Sincroniza src/routes.json com a coleção screens do PocketBase de um projeto csc-web-kit — equivale a "npm run pb:sync-screens". Use após criar/alterar rotas para registrá-las e ligar o controle de acesso.
---

# /sync-telas — Sincronizar rotas → PocketBase

Sincroniza `src/routes.json` com a coleção `screens` do PocketBase via
`npm run pb:sync-screens`.

## Quando usar

Depois de criar/alterar uma tela (manualmente ou via `/web-kit:nova-tela`), para que a
rota apareça na coleção `screens`, receba o grupo `admin` automaticamente e — quando a
rota tiver o campo `collection` — sincronize a `listRule`/`viewRule` da coleção ligada.

> O `npm start` já roda esse sync automaticamente quando o hash do `routes.json` muda.
> Use esta skill quando quiser forçar o sync sem reiniciar o stack.

## Passos

1. Confirme que o diretório atual é um projeto csc-web-kit (`package.json` com o
   script `pb:sync-screens`). Se não, peça o caminho e faça `cd`.
2. Garanta que o PocketBase está no ar (a sync chama a API). Se não estiver, suba com `/web-kit:dev`.
3. Rode:

```bash
npm run pb:sync-screens
```

4. Reporte quantas telas foram criadas/atualizadas. Lembre o usuário que telas **sem
   grupos** configurados ficam sem acesso para todos — a liberação de grupos é feita
   em `/telas` no app pelo admin.
