import { useState } from 'react'
import { Layout, Card, Table, Button, Input, ErrorMessage } from '../components/ui'
import { useGrupos } from '../hooks/useGrupos'
import type { Group } from '../types'

interface EditState {
  id: string
  name: string
  description: string
}

const EMPTY_FORM    = { name: '', description: '' }
const SYSTEM_GROUPS = ['admin', 'users']

export default function Grupos() {
  const { groups, loading, saving, error, setError, create, update, remove } = useGrupos()
  const [editing, setEditing] = useState<EditState | null>(null)
  const [form, setForm]       = useState(EMPTY_FORM)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    const ok = await create(form)
    if (ok) setForm(EMPTY_FORM)
  }

  async function handleSave() {
    if (!editing) return
    const ok = await update(editing.id, { name: editing.name, description: editing.description })
    if (ok) setEditing(null)
  }

  async function handleDelete(group: Group) {
    if (SYSTEM_GROUPS.includes(group.name)) {
      setError(`O grupo "${group.name}" é um grupo de sistema e não pode ser excluído.`)
      return
    }
    if (!window.confirm(`Excluir o grupo "${group.name}"? Usuários e telas associadas perderão esse vínculo.`)) return
    await remove(group)
  }

  const columns = [
    {
      key: 'name' as const,
      header: 'Nome',
      render: (_: unknown, row: Group) =>
        editing?.id === row.id ? (
          <Input
            value={editing.name}
            onChange={e => setEditing(prev => prev && { ...prev, name: e.target.value })}
            autoFocus
          />
        ) : row.name,
    },
    {
      key: 'description' as const,
      header: 'Descrição',
      render: (_: unknown, row: Group) =>
        editing?.id === row.id ? (
          <Input
            value={editing.description}
            onChange={e => setEditing(prev => prev && { ...prev, description: e.target.value })}
          />
        ) : (row.description || '—'),
    },
    {
      key: 'id' as const,
      header: '',
      render: (_: unknown, row: Group) =>
        editing?.id === row.id ? (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button size="sm" onClick={handleSave} disabled={saving}>Salvar</Button>
            <Button size="sm" variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              size="sm"
              variant="secondary"
              disabled={SYSTEM_GROUPS.includes(row.name)}
              title={SYSTEM_GROUPS.includes(row.name) ? 'Grupo de sistema — nome não pode ser alterado' : undefined}
              style={SYSTEM_GROUPS.includes(row.name) ? { opacity: 0.35 } : undefined}
              onClick={() => setEditing({ id: row.id, name: row.name, description: row.description })}
            >
              Editar
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={SYSTEM_GROUPS.includes(row.name)}
              title={SYSTEM_GROUPS.includes(row.name) ? 'Grupo de sistema — não pode ser excluído' : undefined}
              style={SYSTEM_GROUPS.includes(row.name) ? { opacity: 0.35 } : undefined}
              onClick={() => handleDelete(row)}
            >
              Excluir
            </Button>
          </div>
        ),
    },
  ]

  return (
    <Layout>
      <Card style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Novo grupo</h2>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '160px' }}>
            <Input
              label="Nome"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="ex: financeiro"
              required
            />
          </div>
          <div style={{ flex: '2', minWidth: '200px' }}>
            <Input
              label="Descrição"
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="opcional"
            />
          </div>
          <Button type="submit" disabled={saving || !form.name.trim()}>
            Criar grupo
          </Button>
        </form>
      </Card>

      <Card>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Grupos</h1>

        <ErrorMessage message={error} />

        {loading ? (
          <p style={{ color: '#737373' }}>Carregando...</p>
        ) : (
          <Table
            columns={columns}
            data={groups as unknown as Record<string, unknown>[]}
            emptyMessage="Nenhum grupo cadastrado."
          />
        )}
      </Card>
    </Layout>
  )
}
