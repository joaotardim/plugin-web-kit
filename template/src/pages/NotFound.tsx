import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      gap: '0.75rem',
      textAlign: 'center',
      color: '#525252',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <p style={{ fontSize: '4rem', fontWeight: 700, color: '#e5e5e5', lineHeight: 1, margin: 0 }}>404</p>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1a1a2e', margin: 0 }}>
        Página não encontrada
      </h1>
      <p style={{ fontSize: '0.875rem' }}>
        O endereço que você acessou não existe.
      </p>
      <Link
        to="/"
        style={{ marginTop: '0.5rem', color: '#1a1a2e', fontWeight: 600, fontSize: '0.875rem' }}
      >
        ← Ir para o início
      </Link>
    </div>
  )
}
