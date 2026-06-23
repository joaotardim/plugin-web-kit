# web-kit — plugin Claude Code

Plugin que transforma o **csc-web-kit** num kit instalável: cria projetos do zero,
gera telas/componentes/hooks no padrão do kit e expõe o ciclo de vida do backend
**PocketBase** como slash commands.

Stack do projeto gerado: **React 18 + TypeScript (strict) + React Router v6 + PocketBase
+ CSS Modules**. Interface em **português**, sem Tailwind. Autenticação via **Microsoft
Entra ID (OAuth2)** e controle de acesso por grupo configurável em runtime.

---

## O que o plugin entrega

| Comando | O que faz |
|---|---|
| `/web-kit:projeto` | **Cria um projeto novo do zero** a partir do template embutido e sobe o ambiente (PocketBase + Vite). Equivale ao `npm start` de primeiro run do kit. |
| `/web-kit:feature` | Orquestradora: cria telas, componentes, hooks e rotas na ordem de dependência correta. |
| `/web-kit:nova-tela` | Gera uma tela CRUD completa (migration + tipo + hook + página + rota). |
| `/web-kit:novo-componente` | Cria um componente UI reutilizável com CSS Module. |
| `/web-kit:novo-hook` | Cria um hook de dados PocketBase (CRUD). |
| `/web-kit:dev` | Sobe PocketBase + Vite de um projeto existente (`npm start`). |
| `/web-kit:reset` | Limpa artefatos (`pb_data`, `bin`, `dist`, `node_modules`). |
| `/web-kit:oauth` | Configura o OAuth Microsoft Entra ID no PocketBase. |
| `/web-kit:sync-telas` | Sincroniza `routes.json` → coleção `screens`. |
| `/web-kit:superuser` | Cria/atualiza o superusuário do PocketBase. |

O template completo do csc-web-kit (frontend, hooks JSVM, migrations, scripts de
bootstrap) fica embutido em [`template/`](./template) — o `/web-kit:projeto` copia tudo
para a pasta do seu projeto, então **nada do kit fica de fora** e o projeto gerado roda
de forma independente do plugin.

---

## Instalação

### Pré-requisitos
- [Claude Code](https://code.claude.com) atualizado
- **Node.js 18+** e **npm** (o projeto gerado usa scripts `.mjs` e baixa o PocketBase sozinho)
- **git** no PATH

### Opção A — Loop de desenvolvimento (mais rápido, sem marketplace)

Carrega o plugin direto da pasta, só para a sessão atual:

```bash
git clone https://github.com/joaotardim/plugin-web-kit.git
claude --plugin-dir ./plugin-web-kit
```

Editou alguma skill? Recarregue sem reiniciar:

```
/reload-plugins
```

### Opção B — Instalação via marketplace (fluxo "real")

Este repositório já é um marketplace (`.claude-plugin/marketplace.json`):

```bash
git clone https://github.com/joaotardim/plugin-web-kit.git
```

No Claude Code:

```
/plugin marketplace add ./plugin-web-kit
/plugin install web-kit@web-kit
```

> Para instalar direto do GitHub (sem clonar antes):
> `/plugin marketplace add joaotardim/plugin-web-kit` e depois `/plugin install web-kit@web-kit`.

Confirme que carregou digitando `/` — devem aparecer os comandos `/web-kit:*`.

---

## Uso — do zero ao app rodando

### 1. Criar e subir um projeto

```
/web-kit:projeto
```

O plugin pergunta (e você pode já passar no comando):
1. **Empresa** — `fotus` ou `litoral` (identidade/cores/Azure)
2. **Nome do projeto** (default `mvp-<empresa>`)
3. **Pasta de destino** (default `~/projetos/<nome>`)
4. **E-mail** e **senha** (mín. 10 caracteres) do superusuário do PocketBase
5. **(Opcional)** Entra Client Secret, se for ligar o OAuth já

Em seguida ele copia o template, gera o `.env`, roda `npm install` e sobe o stack.

### 2. Ver tudo funcional
- **PocketBase Admin:** http://localhost:8090/_/ (login com o superusuário criado)
- **App:** http://localhost:5173

O primeiro start baixa o binário do PocketBase, cria o superusuário, aplica as
migrations e cria as coleções de sistema (`groups`, `screens`, `users` estendido).

### 3. Gerar uma tela

```
/web-kit:nova-tela produtos
```

Gera migration + tipo + hook + página + rota. Reinicie o `npm start` para aplicar a
migration; o sync de telas roda automaticamente. Depois, em `/telas` no app, o admin
libera quais grupos acessam a rota.

---

## Estrutura do plugin

```
plugin-web-kit/
├── .claude-plugin/
│   ├── plugin.json          # manifesto
│   └── marketplace.json     # marketplace (instalação via /plugin)
├── skills/                  # 10 skills (slash commands /web-kit:*)
│   ├── projeto/  feature/  nova-tela/  novo-componente/  novo-hook/
│   └── dev/  reset/  oauth/  sync-telas/  superuser/
├── bin/
│   └── csc-scaffold.mjs     # scaffold não-interativo (usado por /web-kit:projeto)
└── template/                # cópia fiel do csc-web-kit (src, pocketbase, scripts, config)
```

## Segurança (no projeto gerado)
- Toda rota autenticada usa `<Protected>`; nunca se hard-code nomes de grupo no frontend.
- Tela **sem grupos** configurados = sem acesso para ninguém (inclusive admin) até liberar em `/telas`.
- O hook `screen_rules.pb.js`/`sync_rules.pb.js` mantém a `listRule`/`viewRule` da coleção
  ligada em sincronia com os grupos — não altere essas regras manualmente.
- Um admin não consegue se auto-rebaixar (`prevent_self_demotion.pb.js`); grupos de sistema
  (`admin`, `users`) são protegidos.

## Roadmap
- **Fase 1 (atual):** plugin Claude Code.
- **Fase 2:** adaptador para Codex reusando o mesmo `template/` e as mesmas skills.

## Licença
MIT
