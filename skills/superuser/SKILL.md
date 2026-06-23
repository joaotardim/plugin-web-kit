---
name: superuser
description: Cria ou atualiza o superusuário (admin do banco) do PocketBase de um projeto csc-web-kit — equivale a "npm run pb:superuser -- email senha". Use para criar/redefinir o admin do PocketBase.
---

# /superuser — Criar/atualizar superusuário do PocketBase

Cria ou atualiza (upsert) o superusuário do PocketBase via `npm run pb:superuser`.

## Passos

1. Confirme que o diretório atual é um projeto csc-web-kit (`package.json` com o
   script `pb:superuser`). Se não, peça o caminho e faça `cd`.
2. Colete **e-mail** e **senha** (mínimo 10 caracteres) — pergunte se não vieram no pedido.
3. Rode (a senha vai como argumento — evite ecoar em logs além do necessário):

```bash
npm run pb:superuser -- <email> '<senha>'
```

4. Confirme o resultado. O e-mail/senha do `.env` (`PB_SUPERUSER_EMAIL` /
   `PB_SUPERUSER_PASSWORD`) são re-sincronizados automaticamente a cada `npm start`,
   então para uma mudança permanente atualize também o `.env`.
