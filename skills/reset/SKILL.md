---
name: reset
description: Reseta/limpa artefatos de um projeto csc-web-kit (pb_data sempre; opcionalmente bin do PocketBase, dist e node_modules). Use para zerar o banco ou limpar o projeto.
---

# /reset — Limpar artefatos do projeto

Executa a limpeza interativa do projeto csc-web-kit atual via `npm run reset`.

## Passos

1. Confirme que o diretório atual é um projeto csc-web-kit (`package.json` com o
   script `reset` e a pasta `pocketbase/`). Se não, peça o caminho e faça `cd`.
2. **Avise o usuário** que isso apaga `pocketbase/pb_data` (todo o banco/superusuário)
   e, opcionalmente, `pocketbase/bin`, `dist` e `node_modules`. Confirme antes.
3. Pare qualquer `npm start` em execução (o reset falha com a porta/arquivos em uso).
4. Rode:

```bash
npm run reset
```

O script é interativo e pede confirmação (s/N). Se rodar num ambiente sem TTY,
informe o usuário para executá-lo no próprio terminal com `! npm run reset`.

Após o reset, o próximo `npm start` recria o banco, o superusuário (do `.env`) e
re-sincroniza as telas.
