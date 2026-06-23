import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { Screen } from '../types'
import { pb } from '../api/client'
import { useAuth } from './useAuth'

interface PermissionsValue {
  canAccess: (path: string) => boolean
  loading: boolean
}

const PermissionsContext = createContext<PermissionsValue>({
  canAccess: () => true,
  loading: false,
})

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth()
  const [screens, setScreens] = useState<Screen[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) {
      setScreens(null)
      setLoading(false)
      return
    }
    setLoading(true)
    pb.collection('screens').getFullList<Screen>({ requestKey: null })
      .then(s => setScreens(s))
      .catch(() => setScreens(null))
      .finally(() => setLoading(false))
  }, [isAuthenticated])

  function canAccess(path: string): boolean {
    if (!screens) return false
    const screen = screens.find(s => s.route === path)
    if (!screen || screen.groups.length === 0) return false
    const userGroupId = user?.group
    if (!userGroupId) return false
    return screen.groups.includes(userGroupId)
  }

  return (
    <PermissionsContext.Provider value={{ canAccess, loading }}>
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissions() {
  return useContext(PermissionsContext)
}
