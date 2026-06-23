import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { usePermissions } from './PermissionsContext'

interface ScreenGuardProps {
  children: ReactNode
}

export function ScreenGuard({ children }: ScreenGuardProps) {
  const { canAccess, loading } = usePermissions()
  const { pathname } = useLocation()

  if (!loading && !canAccess(pathname)) return <Navigate to="/sem-acesso" replace />

  return <>{children}</>
}
