# /novo-hook

Cria um hook de dados customizado para integração com PocketBase, seguindo os padrões do projeto.

## Contexto do projeto

- Hooks ficam em `src/hooks/`
- Padrão: `useCallback` + `useEffect` + estados `loading / saving / error`
- Cliente PocketBase: `import { pb } from '../api/client'`
- Tipos: `import type { Entidade } from '../types'`
- Idioma das mensagens de erro: Português

## O que criar

$ARGUMENTS

---

## Passos

### PASSO 1 — Leia a referência

Leia `src/hooks/useGrupos.ts` para seguir o padrão exato.

### PASSO 2 — Planeje

1. Nome do hook: `useNomeDaEntidade`
2. Coleção PocketBase: `nome_colecao`
3. Tipo retornado: existe em `src/types/index.ts`? Se não, criar primeiro
4. Operações necessárias: listar / criar / editar / deletar / outras
5. Campos de ordenação padrão

### PASSO 3 — Crie `src/hooks/useNomeDaEntidade.ts`

Estrutura obrigatória:

```typescript
import { useState, useEffect, useCallback } from 'react'
import { pb } from '../api/client'
import type { Entidade } from '../types'

export function useNomeDaEntidade() {
  const [items, setItems]     = useState<Entidade[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const load = useCallback(() => {
    pb.collection('colecao')
      .getFullList<Entidade>({ sort: 'campo', requestKey: null })
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

  const create = useCallback(async (data: Omit<Entidade, keyof RecordModel>) => {
    setSaving(true)
    setError(null)
    try {
      const created = await pb.collection('colecao').create<Entidade>(data)
      setItems(prev => [...prev, created].sort((a, b) => a.nome.localeCompare(b.nome)))
      return true
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar.')
      return false
    } finally {
      setSaving(false)
    }
  }, [])

  const update = useCallback(async (id: string, data: Partial<Entidade>) => {
    setSaving(true)
    setError(null)
    try {
      const updated = await pb.collection('colecao').update<Entidade>(id, data)
      setItems(prev => prev.map(item => item.id === updated.id ? updated : item))
      return true
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.')
      return false
    } finally {
      setSaving(false)
    }
  }, [])

  const remove = useCallback(async (id: string) => {
    setError(null)
    try {
      await pb.collection('colecao').delete(id)
      setItems(prev => prev.filter(item => item.id !== id))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir.')
    }
  }, [])

  return { items, loading, saving, error, setError, create, update, remove }
}
```

### Regras obrigatórias

- **Named export** — não default
- **`useCallback`** em todas as funções mutadoras
- **Sem refetch** após mutação — atualizar o estado local diretamente
- **`requestKey: null`** no `getFullList` para desabilitar deduplicação automática
- **`err instanceof Error`** em todos os catch — nunca usar `any`
- **`saving`** booleano simples para hooks que salvam um item por vez; use `string | false` (igual ao `Usuarios`) se precisar controlar saving por linha
- Omitir operações que não fazem sentido para a entidade (ex: sem `remove` se não há deleção)

### PASSO 4 — Checklist

- [ ] Named export
- [ ] Sem imports não utilizados
- [ ] Tipo da entidade existe em `src/types/index.ts`
- [ ] `requestKey: null` no getFullList
- [ ] Erros com mensagem em português
