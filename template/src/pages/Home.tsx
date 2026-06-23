import { useAuth } from '../auth'
import { Layout, Card, Table } from '../components/ui'

const SAMPLE_COLUMNS = [
  { key: 'id' as const, header: '#' },
  { key: 'name' as const, header: 'Nome' },
  { key: 'status' as const, header: 'Status' },
]

const SAMPLE_DATA = [
  { id: '1', name: 'Item de exemplo', status: 'Ativo' },
]

export default function Home() {
  const { user } = useAuth()

  return (
    <Layout>
      <Card style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Bem-vindo, {user?.name ?? user?.email ?? 'usuário'}!
        </h1>
        <p style={{ color: '#525252' }}>
          Este é o ponto de partida do <strong>csc-web-kit</strong>. Substitua este
          conteúdo com a sua aplicação.
        </p>
      </Card>

      <Table columns={SAMPLE_COLUMNS} data={SAMPLE_DATA} />
    </Layout>
  )
}
