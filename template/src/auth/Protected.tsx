import type { ReactNode } from 'react'
import { AuthGuard } from './AuthGuard'
import { ScreenGuard } from './ScreenGuard'

export function Protected({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <ScreenGuard>{children}</ScreenGuard>
    </AuthGuard>
  )
}
