import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../auth'
import { usePermissions } from '../../auth/PermissionsContext'
import { config } from '../../config'
import routes from '../../routes.json'
import styles from './Layout.module.css'

interface LayoutProps {
  children: ReactNode
}

type Route = { path: string; name: string; section?: string }

function groupRoutes(list: Route[]) {
  const sections: { title: string | null; items: Route[] }[] = []
  for (const route of list) {
    const title = route.section ?? null
    const existing = sections.find(s => s.title === title)
    if (existing) existing.items.push(route)
    else sections.push({ title, items: [route] })
  }
  return sections
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth()
  const { canAccess } = usePermissions()

  function renderNav() {
    return groupRoutes(routes).map(({ title, items }) => {
      const visible = items.filter(r => canAccess(r.path))
      if (visible.length === 0) return null
      return (
        <div key={title ?? '__root__'}>
          {title && <span className={styles.navSection}>{title}</span>}
          {visible.map(route => (
            <NavLink
              key={route.path}
              to={route.path}
              end={route.path === '/'}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
            >
              {route.name}
            </NavLink>
          ))}
        </div>
      )
    })
  }

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.headerBrand}>
          <span className={styles.logo}>{config.name}</span>
        </div>
        <div className={styles.headerUser}>
          <span className={styles.userName}>{user?.name ?? user?.email}</span>
          <button className={styles.logoutBtn} onClick={logout} type="button">
            Sair
          </button>
        </div>
      </header>

      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <nav className={styles.nav}>
            {renderNav()}
          </nav>
        </aside>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  )
}
