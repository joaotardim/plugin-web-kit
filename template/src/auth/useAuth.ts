import { useState, useEffect, useCallback } from 'react'
import { pb } from '../api/client'
import { AUTH_CONFIG } from './authConfig'
import type { RecordModel } from 'pocketbase'

interface AuthUser extends RecordModel {
  name: string
  email: string
  avatar?: string
  group?: string
}

interface UseAuthReturn {
  user: AuthUser | null
  isAuthenticated: boolean
  login: () => Promise<void>
  logout: () => void
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(
    pb.authStore.model as AuthUser | null,
  )

  useEffect(() => {
    return pb.authStore.onChange(() => {
      setUser(pb.authStore.model as AuthUser | null)
    })
  }, [])

  const login = useCallback(async () => {
    // O PocketBase abre um popup para o fluxo OAuth2 com a Microsoft.
    // O client_id e secret ficam configurados no PocketBase admin,
    // não no frontend.
    const authData = await pb
      .collection('users')
      .authWithOAuth2({ provider: AUTH_CONFIG.providerName })
    setUser(authData.record as AuthUser)
  }, [])

  const logout = useCallback(() => {
    pb.authStore.clear()
    setUser(null)
  }, [])

  return {
    user,
    isAuthenticated: pb.authStore.isValid,
    login,
    logout,
  }
}
