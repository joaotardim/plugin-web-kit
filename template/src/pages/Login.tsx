import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { config } from '../config'
import { Button } from '../components/ui'
import styles from './Login.module.css'

export default function Login() {
  const { login, isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  if (isAuthenticated) return <Navigate to="/" replace />

  async function handleLogin() {
    setLoading(true)
    setError(null)
    try {
      await login()
    } catch {
      setError('Falha ao autenticar. Verifique sua conta e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.logo}>{config.name}</h1>
        <p className={styles.subtitle}>Faça login para continuar</p>
        {error && (
          <p style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '0.75rem', textAlign: 'center' }}>
            {error}
          </p>
        )}
        <Button onClick={handleLogin} disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Aguarde...' : config.loginButtonText}
        </Button>
      </div>
    </div>
  )
}
