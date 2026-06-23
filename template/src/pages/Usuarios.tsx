import { Layout, Card, Table, ErrorMessage } from '../components/ui'
import { useUsuarios } from '../hooks/useUsuarios'
import { useAuth } from '../auth'
import type { UserRow } from '../types'

export default function Usuarios() {
  const { users, groups, loading, saving, error, updateGroup } = useUsuarios()
  const { user } = useAuth()

  const columns = [
    { key: 'name' as const, header: 'Nome' },
    { key: 'email' as const, header: 'E-mail' },
    {
      key: 'group' as const,
      header: 'Grupo',
      render: (_: unknown, row: UserRow) => {
        // RF-07: ninguém altera o próprio grupo (evita auto-bloqueio). A trava
        // real está no hook prevent_self_demotion.pb.js; aqui é só UX.
        const isSelf = row.id === user?.id
        const isDisabled = saving === row.id || isSelf
        return (
          <select
            value={row.group ?? ''}
            disabled={isDisabled}
            title={isSelf ? 'Você não pode alterar o seu próprio grupo. Peça a outro administrador.' : undefined}
            onChange={e => updateGroup(row.id, e.target.value)}
            style={{
              padding: '0.25rem 0.5rem',
              borderRadius: '0.375rem',
              border: '1px solid #d4d4d4',
              background: isDisabled ? '#f5f5f5' : '#fff',
              width: '100%',
              cursor: isSelf ? 'not-allowed' : saving === row.id ? 'wait' : 'pointer',
            }}
          >
            <option value="">— sem grupo —</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        )
      },
    },
  ]

  return (
    <Layout>
      <Card>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
          Gerenciar usuários
        </h1>

        <ErrorMessage message={error} />

        {loading ? (
          <p style={{ color: '#737373' }}>Carregando...</p>
        ) : (
          <Table
            columns={columns}
            data={users as unknown as Record<string, unknown>[]}
            emptyMessage="Nenhum usuário encontrado."
          />
        )}
      </Card>
    </Layout>
  )
}
