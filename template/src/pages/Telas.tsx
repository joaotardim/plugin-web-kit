import { Layout, Card, Table, ErrorMessage } from '../components/ui'
import { useTelas } from '../hooks/useTelas'
import type { Screen } from '../types'

export default function Telas() {
  const { screens, groups, loading, saving, error, toggleGroup } = useTelas()

  const columns = [
    { key: 'name' as const,  header: 'Tela'  },
    { key: 'route' as const, header: 'Rota'  },
    {
      key: 'groups' as const,
      header: 'Grupos com acesso',
      render: (_: unknown, row: Screen) => (
        groups.length === 0
          ? <span style={{ color: '#a3a3a3', fontSize: '0.875rem' }}>Nenhum grupo criado</span>
          : (
            <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
              {groups.map(group => {
                const isAdmin   = group.name === 'admin'
                const isChecked = isAdmin || (row.groups ?? []).includes(group.id)
                const isDisabled = isAdmin || saving === row.id
                return (
                  <label
                    key={group.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      fontSize: '0.875rem',
                      cursor: isDisabled ? 'default' : 'pointer',
                      opacity: saving === row.id ? 0.6 : 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isDisabled}
                      onChange={isAdmin ? undefined : e => toggleGroup(row.id, group.id, e.target.checked, row.groups ?? [])}
                    />
                    {group.name}
                    {isAdmin && (
                      <span style={{ color: '#a3a3a3', fontSize: '0.75rem' }}>(sempre)</span>
                    )}
                  </label>
                )
              })}
            </div>
          )
      ),
    },
  ]

  return (
    <Layout>
      <Card>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
          Permissões por tela
        </h1>

        <ErrorMessage message={error} />

        {loading ? (
          <p style={{ color: '#737373' }}>Carregando...</p>
        ) : (
          <Table
            columns={columns}
            data={screens as unknown as Record<string, unknown>[]}
            emptyMessage="Nenhuma tela cadastrada. Adicione rotas em src/routes.json."
          />
        )}
      </Card>
    </Layout>
  )
}
