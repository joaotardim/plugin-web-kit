---
name: nova-tela
description: Gera uma tela CRUD completa no padrão csc-web-kit: migration PocketBase, tipo em src/types, hook, página (Layout > Card > Table) e registro de rota. Use ao criar uma nova tela/página com dados.
---

# /nova-tela

Cria uma nova tela completa no projeto: tipo TypeScript → hook PocketBase → página React → rota registrada.

## Contexto do projeto

- **Stack**: React 18 + TypeScript strict + React Router v6 + PocketBase + CSS Modules
- **Idioma**: Português em toda interface (labels, mensagens, comentários)
- **Padrão de página**: `Layout > Card(s) > Table + form inline`
- **Padrão de hook**: `useCallback` + `useEffect` + estados `loading/saving/error`
- **Sem Tailwind** — apenas CSS Modules e `style={{}}` inline para valores pontuais

## O que o usuário quer criar

$ARGUMENTS

---

## Passos obrigatórios — execute na ordem

### PASSO 1 — Leia os arquivos de referência antes de gerar qualquer código

Leia estes arquivos para seguir os padrões exatos:
- `src/types/index.ts`
- `src/hooks/useGrupos.ts`
- `src/pages/Grupos.tsx`
- `src/App.tsx`
- `src/routes.json`

### PASSO 2 — Planeje em voz alta

Antes de criar arquivos, defina:
1. **Nome da entidade** (PascalCase, singular) — ex: `Produto`
2. **Rota** — ex: `/produtos`
3. **Coleção PocketBase** — ex: `products` (snake_case, plural, inglês)
4. **Campos** — nome, tipo TypeScript, obrigatório ou não
5. **Operações** — quais de: listar / criar / editar / deletar
6. **Seção do menu** — ex: `"Cadastros"` (ou omitir se for raiz)
7. **Proteger via `collection`?** — se a tela gerencia uma coleção PocketBase sensível, preencher o campo `collection` no `routes.json` faz o hook `screen_rules.pb.js` sincronizar a `listRule`/`viewRule` automaticamente quando o admin alterar os grupos em `/telas`
8. **Regras de acesso PocketBase** — `createRule`, `updateRule`, `deleteRule` (a `listRule`/`viewRule` é gerenciada pelo hook se `collection` estiver preenchido)

### PASSO 3 — Crie a migration PocketBase para a coleção nova

> **Se a tela busca dados de uma coleção nova, crie o arquivo de migration ANTES de criar hook ou página.**  
> O app vai dar 404 ao tentar `getFullList` numa coleção que não existe — a migration cria a coleção automaticamente ao iniciar o PocketBase.

Crie o arquivo `pocketbase/pb_migrations/{timestamp}_created_{colecao}.js` usando o timestamp Unix atual (obtenha com `date +%s` no bash).

Use este template:

```js
/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "@request.auth.id != \"\"",
    "deleteRule": "@request.auth.id != \"\"",
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210256",
        "max": 15, "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      // campo texto:
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_ENTIDADE_CAMPO",
        "max": 0, "min": 0,
        "name": "campo",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      // campo número:
      {
        "hidden": false,
        "id": "number_ENTIDADE_CAMPO",
        "max": null, "min": null,
        "name": "campo",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      // campo bool:
      {
        "hidden": false,
        "id": "bool_ENTIDADE_CAMPO",
        "name": "campo",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      }
    ],
    "id": "pbc_{colecao}{timestamp_curto}",
    "indexes": [],
    "listRule": null,
    "name": "nome_colecao",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.id != \"\"",
    "viewRule": null
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("nome_colecao");
  return app.delete(collection);
})
```

Regras da migration:
- `listRule` / `viewRule`: sempre `null` quando a rota usa `collection` no `routes.json` — o hook `screen_rules.pb.js` gerencia automaticamente
- `createRule` / `updateRule` / `deleteRule`: `@request.auth.id != ""` por padrão (qualquer usuário autenticado pode escrever); ajuste conforme necessidade
- Cada campo precisa de um `id` único — use o padrão `{tipo}_{entidade}_{campo}` (ex: `text_produto_nome`)
- O campo `id` do sistema (primaryKey) deve sempre ser incluído com `"id": "text3208210256"` 

**Após criar a migration**, também atualize o hook para tratar 404 e 403 com mensagens úteis:
```ts
.catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : ''
  if (msg.includes('404') || msg.toLowerCase().includes("wasn't found")) {
    setError('Coleção "nome_colecao" não encontrada. Reinicie o PocketBase (npm start) para aplicar a migration.')
  } else if (msg.includes('403')) {
    setError('Sem permissão para listar. Execute "npm run pb:sync-screens" com o PocketBase rodando.')
  } else {
    setError(msg || 'Erro ao carregar.')
  }
})
```

O PocketBase aplica migrations automaticamente ao iniciar. Avise o usuário para reiniciar (`npm start`) se o PocketBase já estiver rodando.

---

### PASSO 4 — Adicione o tipo em `src/types/index.ts`

```typescript
export interface NomeDaEntidade extends RecordModel {
  campo1: string
  campo2: number
  // ...
}
```

### PASSO 5 — Crie o hook `src/hooks/useNomeDaEntidade.ts`

Siga **exatamente** o padrão de `useGrupos.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react'
import { pb } from '../api/client'
import type { NomeDaEntidade } from '../types'

export function useNomeDaEntidade() {
  const [items, setItems]   = useState<NomeDaEntidade[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const load = useCallback(() => {
    pb.collection('colecao')
      .getFullList<NomeDaEntidade>({ sort: 'campo', requestKey: null })
      .then(setItems)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : ''
        if (msg.toLowerCase().includes('404') || msg.toLowerCase().includes("wasn't found")) {
          setError('Coleção não encontrada no PocketBase. Crie a coleção em http://localhost:8090/_/ antes de usar esta tela.')
        } else {
          setError(msg || 'Erro ao carregar.')
        }
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  // Funções create / update / remove com o mesmo padrão:
  // setSaving(true) → setError(null) → try/catch → finally setSaving(false)
  // Atualizar o estado local após cada operação bem-sucedida (sem refetch)

  return { items, loading, saving, error, setError /*, create, update, remove */ }
}
```

Regras do hook:
- `useCallback` em **todas** as funções
- Erros: `err instanceof Error ? err.message : 'Mensagem de fallback.'`
- Atualização imutável do estado: `prev.map(...)`, `[...prev, novo]`, `prev.filter(...)`
- Named export (não default)

### PASSO 6 — Crie a página `src/pages/NomeDaEntidade.tsx`

Siga o padrão de `Grupos.tsx`:

```tsx
import { useState } from 'react'
import { Layout, Card, Table, Button, Input, ErrorMessage } from '../components/ui'
import { useNomeDaEntidade } from '../hooks/useNomeDaEntidade'
import type { NomeDaEntidade } from '../types'

export default function NomeDaEntidade() {
  const { items, loading, saving, error, setError, create, update, remove } = useNomeDaEntidade()
  // estados locais de UI (editing, form, etc.)

  const columns = [
    // colunas com render inline para edição/ações
  ]

  return (
    <Layout>
      {/* Card de criação, se houver */}
      <Card>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
          Nome da Tela
        </h1>
        <ErrorMessage message={error} />
        {loading ? (
          <p style={{ color: '#737373' }}>Carregando...</p>
        ) : (
          <Table
            columns={columns}
            data={items as unknown as Record<string, unknown>[]}
            emptyMessage="Nenhum item cadastrado."
          />
        )}
      </Card>
    </Layout>
  )
}
```

Regras da página:
- Default export
- Sem `any` explícito — use `as unknown as Record<string, unknown>[]` no cast do Table
- Todos os event handlers com tipo correto: `React.FormEvent`, `React.ChangeEvent<HTMLInputElement>`
- `disabled={saving}` em botões de mutação
- Confirmação `window.confirm(...)` antes de deletar

### PASSO 7 — Adicione em `src/routes.json`

Sem proteção de coleção:
```json
{ "path": "/rota", "name": "Nome da Tela", "section": "Seção" }
```

Com proteção automática de `listRule`/`viewRule` via hook:
```json
{ "path": "/rota", "name": "Nome da Tela", "section": "Seção", "collection": "nome_colecao" }
```

Quando `collection` está preenchido, qualquer mudança nos grupos em `/telas` atualiza automaticamente as regras de leitura da coleção no PocketBase.

### PASSO 8 — Registre a rota em `src/App.tsx`

1. Adicione o import junto aos outros imports de páginas:
```tsx
import NomeDaEntidade from './pages/NomeDaEntidade'
```

2. Adicione a `<Route>` **dentro** do bloco `<Routes>`, antes da rota `*`:
```tsx
<Route path="/rota" element={<Protected><NomeDaEntidade /></Protected>} />
```

**Nunca** omitir o `<Protected>` — toda rota autenticada precisa dele.

### PASSO 9 — Checklist antes de finalizar

- [ ] Coleção PocketBase criada (se nova) — sem isso o hook dá 404
- [ ] `src/types/index.ts` tem a nova interface
- [ ] Hook exportado como named export, sem erros TypeScript
- [ ] Página exportada como default export
- [ ] `routes.json` atualizado
- [ ] `App.tsx` com import + Route
- [ ] Sem `any` explícito no código gerado
- [ ] Todos os `catch (err: unknown)` tratados corretamente
- [ ] Variáveis sem uso removidas (`noUnusedLocals` é strict)

### PASSO 10 — Sincronize a rota com o PocketBase

O `npm start` aplica migrations e roda o sync automaticamente quando `routes.json` muda. O fluxo depende do estado do PocketBase:

**Se o PocketBase NÃO está rodando:**
Diga ao usuário para rodar `npm start`. Tudo acontece automaticamente — migration cria a coleção, sync configura a tela e as regras.

**Se o PocketBase JÁ está rodando:**
A migration nova ainda não foi aplicada (PocketBase não recarrega migrations em runtime). Peça ao usuário para reiniciar:

> "Precisa reiniciar o PocketBase para aplicar a migration da nova coleção. Encerre com Ctrl+C e rode `npm start` novamente."

Após o restart, o `npm start` detecta que `routes.json` mudou e roda o sync automaticamente. Nenhum passo manual necessário.

**Não rode `npm run pb:sync-screens` manualmente** enquanto a migration não foi aplicada — a coleção ainda não existe e o sync não consegue configurar as regras.

### PASSO 11 — Informe o admin sobre a coleção PocketBase

Ao final, informe quais recursos do PocketBase precisam ser criados manualmente:

**Coleção de dados** (se a tela precisar de uma coleção nova):
> Crie a coleção `nome_colecao` no PocketBase (`http://localhost:8090/_/`) com os campos:
> - `campo1` (text, obrigatório)
> - `campo2` (number)
> - Regras sugeridas:
>   - `listRule` / `viewRule`: deixe em branco se usou `collection` no `routes.json` — o hook gerencia automaticamente
>   - `createRule/updateRule/deleteRule: '@request.auth.group.name = "admin"'` — só admins modificam (configure manualmente)

**Acesso à tela** (sempre):
> A nova rota `/rota` foi criada no PocketBase com o grupo **admin** pré-configurado (acesso exclusivo até o admin liberar outros grupos).
> Para conceder acesso a outros grupos, acesse `/telas` no app — as regras de API são atualizadas automaticamente.
