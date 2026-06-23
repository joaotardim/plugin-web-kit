---
name: projeto
description: Cria um projeto novo do zero a partir do template csc-web-kit (scaffold completo) e sobe o ambiente (PocketBase + Vite) — equivale ao que o "npm start" do template faz no primeiro run. Use quando o usuário quiser instalar/iniciar um novo projeto.
---

# /projeto — Criar e subir um projeto do zero

Materializa um projeto novo a partir do template **csc-web-kit** embutido no plugin
e sobe o ambiente de desenvolvimento. Substitui o wizard interativo `npm start` do
template, coletando os dados na conversa e chamando o scaffold de forma determinística.

## Pedido

$ARGUMENTS

---

## PASSO 1 — Colete os dados (pergunte só o que faltar em `$ARGUMENTS`)

Pergunte um de cada vez, com defaults claros:

1. **Empresa** — `fotus` ou `litoral` (define identidade/cores/Azure). Default: `fotus`.
2. **Nome do projeto** — kebab-case. Default: `mvp-<empresa>`.
3. **Pasta de destino** — caminho absoluto FORA do plugin. Default: `~/projetos/<nome>`.
4. **E-mail do superusuário** PocketBase (admin do banco).
5. **Senha do superusuário** — mínimo 10 caracteres.
6. **(Opcional) Entra Client Secret** — só se o usuário for configurar OAuth agora; pode ficar vazio.

Confirme o resumo antes de prosseguir.

## PASSO 2 — Rode o scaffold

O scaffold está em `bin/csc-scaffold.mjs` deste plugin e é exposto no PATH como
`csc-scaffold.mjs`. Ele copia o template, aplica a identidade da empresa, gera o
`.env` e roda `git init`. É **não-interativo** — passe tudo por flags:

```bash
csc-scaffold.mjs \
  --company <fotus|litoral> \
  --name <nome> \
  --dest <pasta-absoluta> \
  --email <email> \
  --password '<senha>' \
  [--secret '<entra_client_secret>']
```

> Se `csc-scaffold.mjs` não estiver no PATH, use o caminho absoluto:
> `node "$CLAUDE_PLUGIN_ROOT/bin/csc-scaffold.mjs" ...` (ou o caminho do plugin onde ele estiver instalado).

Não exponha a senha em logs além do necessário.

## PASSO 3 — Instale dependências e suba o ambiente

No diretório de destino:

```bash
cd "<pasta-destino>" && npm install
```

Depois suba o stack. O `npm start` do projeto gerado já:
- baixa o binário do PocketBase (se faltar),
- cria/sincroniza o superusuário a partir do `.env`,
- aplica as migrations,
- roda `pb:setup`, `pb:oauth` (se houver credenciais) e `pb:sync-screens`,
- sobe PocketBase (`:8090`) e Vite (`:5173`) em paralelo.

Como é um processo longo (servidor), rode em background e reporte as URLs:

```bash
cd "<pasta-destino>" && npm start
```

(use execução em background; aguarde aparecer "Server started" do PocketBase e "Local:" do Vite).

## PASSO 4 — Reporte tudo funcional

Ao final, mostre ao usuário:
- **Admin UI do PocketBase:** http://localhost:8090/_/ (login com o superusuário criado)
- **App (Vite):** http://localhost:5173
- Caminho do projeto e como retomar: `cd "<pasta>" && npm start`
- Lembre que telas novas precisam ter grupos liberados em `/telas` pelo admin.

Se algo falhar (porta ocupada, binário não baixou, etc.), diagnostique a partir do log
e proponha a correção — não declare sucesso sem evidência de que os dois servidores subiram.
