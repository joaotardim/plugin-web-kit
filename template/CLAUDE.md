# csc-web-kit — Instruções para o Claude

## Stack

React 18 + TypeScript strict + React Router v6 + PocketBase + CSS Modules  
Idioma da interface: **Português**. Sem Tailwind.

## Quando o usuário pedir uma nova tela, funcionalidade ou recurso

**OBRIGATÓRIO**: invoque a skill `/feature` via Skill tool **antes** de qualquer outra ação — sem esperar que o usuário a invoque explicitamente.  
Isso inclui pedidos como:
- "Quero uma tela de X"
- "Cria uma página para Y"
- "Adiciona funcionalidade de Z"
- "Preciso gerenciar W no sistema"
- Qualquer pedido que envolva criar ou modificar telas, hooks, componentes ou rotas

Não "siga as instruções" manualmente — use o Skill tool com `skill: "feature"` e `args: <pedido do usuário>`.

## Convenções do projeto

### Estrutura de arquivos
```
src/
  pages/       → um arquivo por tela (default export)
  hooks/       → um arquivo por entidade (named export)
  components/
    ui/        → componentes reutilizáveis + CSS module por componente
  types/       → index.ts centraliza todas as interfaces
  api/         → client.ts (singleton PocketBase)
```

### Padrões obrigatórios
- **Tipos**: toda entidade PocketBase tem interface em `src/types/index.ts` estendendo `RecordModel`
- **Hooks**: `useCallback` em todas as funções, `requestKey: null` no `getFullList`, sem refetch após mutação
- **Páginas**: `Layout > Card > Table`, loading state, `ErrorMessage`, mensagens em português
- **Rotas**: sempre com `<Protected>` em `App.tsx` + entrada em `routes.json`
- **Erros**: `catch (err: unknown)` + `err instanceof Error ? err.message : 'fallback'`
- **TypeScript**: sem `any`, sem variáveis não usadas

### Segurança
- Toda rota autenticada usa `<Protected>` em `App.tsx` — nunca omitir
- Controle de acesso por grupo é configurado via `/telas` no app pelo admin — nunca hard-code nomes de grupos no frontend
- **Tela sem grupos configurados = sem acesso** para ninguém (inclusive admin). O script `pb:sync-screens` adiciona o grupo admin automaticamente em telas novas
- O hook `screen_rules.pb.js` sincroniza automaticamente a `listRule`/`viewRule` da coleção PocketBase associada quando os grupos mudam — não altere regras manualmente para coleções linkadas via campo `collection`
- Regras PocketBase (listRule, createRule, etc.) devem ser informadas ao usuário ao criar nova coleção
- Nunca expor dados sensíveis no frontend

## Comandos úteis

```bash
npm start              # sobe PocketBase + Vite em paralelo
npm run pb:reset       # reseta o banco (apaga pb_data)
npm run pb:oauth       # configura OAuth Microsoft no PocketBase
npm run pb:sync-screens # sincroniza routes.json → coleção screens do PocketBase
```

## PocketBase (não Supabase, não Firebase)

O backend é **PocketBase** — não confundir com Supabase ou Firebase.

- URL: `VITE_POCKETBASE_URL` (`.env`)
- Admin UI: `http://localhost:8090/_/`
- Coleções do sistema: `users`, `groups`, `screens`
- Hooks JSVM: `pocketbase/pb_hooks/`
- Migrations: `pocketbase/pb_migrations/`
- Sync de rotas: `npm run pb:sync-screens` — cria/atualiza entradas na coleção `screens` a partir de `routes.json`; adiciona o grupo admin automaticamente em telas novas; idempotente; roda automaticamente no `npm start` se o hash do `routes.json` mudou
- Campo `collection` em `routes.json`: quando preenchido, o hook `screen_rules.pb.js` mantém a `listRule`/`viewRule` da coleção PocketBase em sincronia com os grupos configurados em `/telas`
