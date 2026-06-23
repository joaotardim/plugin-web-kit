---
name: projeto
description: Cria um projeto novo do zero a partir do template csc-web-kit e sobe o ambiente (PocketBase + Vite). Abre uma telinha local no navegador onde o usuário preenche os dados com segurança (senha mascarada). Use quando o usuário quiser instalar/iniciar um novo projeto.
---

# /projeto — Criar e subir um projeto do zero

Materializa um projeto novo a partir do template **csc-web-kit** embutido no plugin e
sobe o ambiente. O caminho recomendado é a **telinha web local**: o usuário preenche
empresa, nome, pasta, e-mail, **senha** (campo mascarado) e o Entra secret (opcional)
no navegador — nada sensível passa pelo chat.

## Pedido

$ARGUMENTS

---

## PASSO 1 — Abra a telinha (fluxo recomendado)

Suba o servidor da telinha **em background** (é um processo de longa duração). Ele
imprime a URL local (com token) e tenta abrir o navegador automaticamente:

```bash
node "$CLAUDE_PLUGIN_ROOT/bin/csc-setup.mjs"
```

> Se `$CLAUDE_PLUGIN_ROOT` não estiver definido, o script também é exposto no PATH como
> `csc-setup.mjs` (rode `csc-setup.mjs`). Em último caso, use o caminho absoluto do
> plugin instalado (`.../plugins/.../web-kit/bin/csc-setup.mjs`).

Capture a URL impressa (algo como `http://127.0.0.1:4321/?t=<token>`) e mostre ao
usuário, pedindo para preencher o formulário. A telinha, ao enviar:
1. cria o projeto a partir do template (copia tudo, gera `.env`, aplica a identidade),
2. roda `npm install`,
3. roda `npm start` (que baixa o PocketBase, cria o superusuário do `.env`, aplica
   migrations e roda `pb:setup`/`pb:oauth`/`pb:sync-screens`),
4. mostra os links **App (:5173)** e **PocketBase Admin (:8090)** quando tudo sobe.

Não peça a senha nem o secret no chat — eles são digitados na telinha. Acompanhe o
processo; quando o usuário disser que está pronto (ou os servidores responderem),
confirme as URLs.

## PASSO 2 — Fallback sem navegador (terminal/CI)

Se não houver navegador (ambiente headless) ou o usuário preferir o terminal, use o CLI.
Ele pede a senha com **máscara** num TTY; **não** peça a senha no chat:

```bash
# o usuário roda isto no próprio terminal (prefixo ! no Claude Code), a senha é mascarada:
node "$CLAUDE_PLUGIN_ROOT/bin/csc-scaffold.mjs" --company <fotus|litoral> --name <nome> --dest <pasta> --email <email>
# depois:
cd "<pasta>" && npm install && npm start
```

Alternativa não-interativa: definir `PB_SUPERUSER_PASSWORD` no ambiente antes de chamar o CLI.

## PASSO 3 — Reporte tudo funcional

Confirme ao usuário:
- **App (Vite):** http://localhost:5173
- **PocketBase Admin:** http://localhost:8090/_/ (login com o superusuário criado)
- Caminho do projeto e como retomar: `cd "<pasta>" && npm start`
- Telas novas precisam ter grupos liberados em `/telas` pelo admin para aparecer.

Se algo falhar (porta ocupada, binário não baixou, etc.), use o log do projeto
(`.web-kit-start.log` na pasta dele) para diagnosticar — não declare sucesso sem
evidência de que os dois servidores subiram.
