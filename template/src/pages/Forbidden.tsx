import { Link } from 'react-router-dom'
import { Layout } from '../components/ui'

export default function Forbidden() {
  return (
    <Layout>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: '0.75rem',
        textAlign: 'center',
        color: '#525252',
      }}>
        <p style={{ fontSize: '4rem', fontWeight: 700, color: '#e5e5e5', lineHeight: 1, margin: 0 }}>403</p>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1a1a2e', margin: 0 }}>
          Sem acesso
        </h1>
        <p style={{ fontSize: '0.875rem', maxWidth: '320px', lineHeight: 1.5 }}>
          Você não tem permissão para visualizar esta página.
          Solicite acesso ao administrador do sistema.
        </p>
        <Link
          to="/"
          style={{ marginTop: '0.5rem', color: '#1a1a2e', fontWeight: 600, fontSize: '0.875rem' }}
        >
          ← Ir para o início
        </Link>
      </div>
    </Layout>
  )
}
