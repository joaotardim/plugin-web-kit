---
name: oauth
description: Configura o provedor OAuth2 Microsoft Entra ID na coleção users do PocketBase de um projeto csc-web-kit — equivale a "npm run pb:oauth". Use para ligar o login Microsoft.
---

# /oauth — Configurar OAuth Microsoft Entra ID

Configura o provedor `microsoft` no PocketBase do projeto atual via `npm run pb:oauth`.

## Pré-requisitos

- PocketBase precisa estar acessível (rode `/web-kit:dev` antes, ou tenha o servidor no ar).
- Credenciais do App Registration no Azure: **Client ID**, **Tenant ID** e (opcional)
  **Client Secret**. Podem vir do `.env` (`ENTRA_CLIENT_ID`, `ENTRA_TENANT_ID`,
  `ENTRA_CLIENT_SECRET`) ou serem informadas interativamente.

## Passos

1. Confirme que o diretório atual é um projeto csc-web-kit (`package.json` com o
   script `pb:oauth`). Se não, peça o caminho e faça `cd`.
2. Rode:

```bash
npm run pb:oauth
```

3. O script autentica como superusuário, aplica a config OAuth2 na coleção `users`
   e imprime o **Redirect URI** a registrar no Azure
   (`http://localhost:8090/api/oauth2-redirect` em dev).
4. Repasse o Redirect URI ao usuário e lembre que o usuário criado via OAuth recebe
   grupo automaticamente (`auto_assign_group.pb.js`): o primeiro vira `admin`, os demais `users`.

Se o script for interativo e o ambiente não tiver TTY, oriente o usuário a rodar
`! npm run pb:oauth` no terminal, ou preencher as variáveis `ENTRA_*` no `.env` antes.
