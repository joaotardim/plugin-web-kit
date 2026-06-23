---
name: feature
description: Orquestradora do csc-web-kit: cria telas, componentes, hooks e rotas na ordem de dependência correta, com segurança (Protected, sem grupos hard-coded) e padrões TypeScript/PocketBase. Use quando o usuário pedir uma nova tela, página, funcionalidade ou recurso no projeto.
---

# /feature — Orquestradora

Analisa o pedido do usuário e decide quais artefatos criar, em que ordem e com quais dependências.

## Pedido

$ARGUMENTS

---

## Como orquestrar

### PASSO 1 — Entenda o pedido completamente

Leia `$ARGUMENTS` e classifique o que é necessário:

| O que é pedido | Ação |
|---|---|
| Nova tela/página completa | Executar skill `/nova-tela` |
| Novo componente UI reutilizável | Executar skill `/novo-componente` |
| Novo hook de dados | Executar skill `/novo-hook` |
| Funcionalidade em tela existente | Modificar página + hook existentes diretamente |
| Combinação de vários | Executar skills na ordem correta (dependências primeiro) |

Se não tiver certeza do escopo, **pergunte antes de criar**.

### PASSO 2 — Mapeie dependências

Execute as skills/ações nessa ordem de dependência:

```
1. Migration PocketBase (se coleção nova)  ← SEMPRE primeiro; sem ela o hook dá 404
2. Tipos (src/types/index.ts)              ← base de tudo
3. Hook (src/hooks/)                       ← depende dos tipos
4. Componentes UI novos (se precisar)      ← independentes
5. Página (src/pages/)                     ← depende do hook e componentes
6. Rota (routes.json + App.tsx)            ← depende da página
```

> **Regra obrigatória**: toda tela que usa uma coleção PocketBase nova deve ter um arquivo de migration em `pocketbase/pb_migrations/`. Nunca pule este passo — é o que causa o erro 404 ao tentar `getFullList` numa coleção inexistente. Siga as instruções de migration do PASSO 3 da skill `/nova-tela`.

### PASSO 3 — Leia os arquivos relevantes antes de modificar

Antes de qualquer edição em arquivo existente, leia-o para entender o contexto atual.  
Arquivos a sempre ter em mente:
- `src/App.tsx` — para adicionar rotas
- `src/routes.json` — para registrar no menu
- `src/types/index.ts` — para adicionar tipos
- `src/components/ui/index.ts` — para exportar novos componentes

### PASSO 4 — Execute cada skill como um sub-passo

Para cada artefato necessário, aplique as instruções da skill correspondente como se tivesse sido invocada diretamente com os argumentos corretos.

Após cada artefato criado, confirme antes de passar para o próximo se houver dúvidas de dependência.

### PASSO 5 — Segurança e boas práticas (nunca pular)

**Autenticação/Autorização:**
- Toda nova rota deve usar `<Protected>` em `App.tsx`
- Nunca expor dados sem autenticação
- O controle de acesso por grupo é feito via `/telas` pelo admin — nunca hard-code nomes de grupos (`'admin'`, `'users'`) no frontend
- **Tela sem grupos configurados = sem acesso** para ninguém. O `pb:sync-screens` adiciona o grupo admin automaticamente em telas novas — não é preciso configurar manualmente
- Se a tela tiver uma coleção PocketBase associada (campo `collection` no `routes.json`), a `listRule`/`viewRule` é gerenciada automaticamente pelo hook `screen_rules.pb.js`. Não altere essas regras manualmente

**TypeScript:**
- Sem `any` explícito
- Todos os `catch` com `err: unknown` e verificação `instanceof Error`
- `noUnusedLocals` e `noUnusedParameters` são strict — não deixar imports ou variáveis sem uso

**PocketBase:**
- `requestKey: null` em chamadas `getFullList` dentro de hooks
- Nunca armazenar tokens ou dados sensíveis no localStorage manualmente
- Regras de coleção (listRule, createRule, etc.) devem ser informadas ao usuário ao final

**UX/Consistência:**
- Mensagens em português
- Estados de loading e erro em todas as telas com dados assíncronos
- `disabled={saving}` em botões de mutação
- `window.confirm(...)` antes de deletar

### PASSO 6 — Sincronize rotas com o PocketBase

O `npm start` aplica migrations e roda o sync automaticamente quando `routes.json` muda. O fluxo depende do estado atual:

**PocketBase NÃO está rodando:**
Diga ao usuário para rodar `npm start`. Migration cria a coleção, sync configura tela e regras — tudo automático.

**PocketBase JÁ está rodando:**
Migration nova só é aplicada no próximo restart. Informe o usuário:

> "Reinicie o PocketBase (Ctrl+C → `npm start`) para aplicar a migration e ativar a nova tela."

Após o restart, `npm start` detecta a mudança em `routes.json` e roda o sync automaticamente. Nenhum passo manual adicional.

### PASSO 7 — Resumo ao finalizar

Ao terminar, apresente:
1. **Arquivos criados/modificados** — com caminho completo
2. **Coleções PocketBase necessárias** — campos e regras sugeridas (listRule, createRule, etc.)
3. **Acesso à tela** — lembrar que `/telas` no app é onde o admin configura quais grupos podem acessar a rota
4. **Como testar** — caminho da rota, o que validar