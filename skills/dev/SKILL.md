---
name: dev
description: Sobe o ambiente de desenvolvimento (PocketBase + Vite) de um projeto csc-web-kit existente — equivale a "npm start". Use para iniciar/rodar um projeto já criado.
---

# /dev — Subir o ambiente

Sobe PocketBase + Vite de um projeto csc-web-kit **já existente** (não cria projeto novo —
para isso use `/web-kit:projeto`).

## Passos

1. Confirme que o diretório atual é um projeto csc-web-kit: deve existir `package.json`
   com o script `start` e a pasta `pocketbase/`. Se não for, peça ao usuário o caminho
   do projeto e faça `cd` antes.
2. Garanta as dependências: se `node_modules/` não existir, rode `npm install`.
3. Suba o stack em background (é um servidor de longa duração):

```bash
npm start
```

4. Aguarde "Server started" (PocketBase) e "Local:" (Vite) e reporte as URLs:
   - PocketBase Admin: http://localhost:8090/_/
   - App: http://localhost:5173

O `npm start` aplica migrations e roda o sync de telas automaticamente quando o
`routes.json` muda. Se uma porta estiver ocupada, diagnostique pelo log antes de reiniciar.
