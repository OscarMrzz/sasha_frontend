import { Link, useRouterState } from '@tanstack/react-router'
import {
  Award,
  Bell,
  BookOpen,
  Calendar,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Clock,
  Download,
  FileText,
  Home,
  Layers,
  LayoutGrid,
  Link2,
  ListTodo,
  Search,
  Settings,
  Shield,
  User,
  Users,
  Wallet,
  BarChart3,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Can, useCan } from '#/components/gates/Can'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { NAV_ITEMS } from '#/helpers/nav'
import { roleLabel, type RoleName } from '#/helpers/permissions'
import { useSession } from '#/hooks/use-session'
import { logout } from '#/services/auth'
import { toast } from 'sonner'
import { userMessageFromError } from '#/lib/api'
import { NotificationsBell } from '#/components/layout/NotificationsBell'

const ICONS: Record<string, ReactNode> = {
  home: <Home className="sidebar-nav__icon" />,
  settings: <Settings className="sidebar-nav__icon" />,
  layers: <Layers className="sidebar-nav__icon" />,
  clock: <Clock className="sidebar-nav__icon" />,
  grid: <LayoutGrid className="sidebar-nav__icon" />,
  book: <BookOpen className="sidebar-nav__icon" />,
  calendar: <Calendar className="sidebar-nav__icon" />,
  users: <Users className="sidebar-nav__icon" />,
  shield: <Shield className="sidebar-nav__icon" />,
  user: <User className="sidebar-nav__icon" />,
  clipboard: <ClipboardList className="sidebar-nav__icon" />,
  link: <Link2 className="sidebar-nav__icon" />,
  'calendar-days': <CalendarDays className="sidebar-nav__icon" />,
  file: <FileText className="sidebar-nav__icon" />,
  check: <CheckSquare className="sidebar-nav__icon" />,
  list: <ListTodo className="sidebar-nav__icon" />,
  award: <Award className="sidebar-nav__icon" />,
  wallet: <Wallet className="sidebar-nav__icon" />,
  bell: <Bell className="sidebar-nav__icon" />,
  chart: <BarChart3 className="sidebar-nav__icon" />,
  download: <Download className="sidebar-nav__icon" />,
  search: <Search className="sidebar-nav__icon" />,
}

export function AppShell({ children }: { children: ReactNode }) {
  const { session, clearSession, setActiveRole } = useSession()
  const { can } = useCan()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [collapsed, setCollapsed] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof document === 'undefined') return 'dark'
    return (document.documentElement.getAttribute('data-theme') as 'dark' | 'light') || 'dark'
  })

  const items = useMemo(() => {
    type Item = { to: string; label: string; permission: (typeof NAV_ITEMS)[number]['permission'] | null; icon: string }
    const base: Item[] = [
      { to: '/dashboard', label: 'Inicio', permission: null, icon: 'home' },
      ...NAV_ITEMS.filter((i) => i.to !== '/dashboard'),
    ]
    return base.filter((i) => (i.permission ? can(i.permission) : true))
  }, [can])

  const roleOptions = session?.knownRoles ?? []

  return (
    <div className="app-shell" data-theme={theme}>
      <aside
        className={`app-shell__sidebar${collapsed ? ' app-shell__sidebar--collapsed' : ''}`}
        aria-label="Navegación principal"
      >
        <div className="sidebar-brand">
          {!collapsed ? (
            <>
              <p className="sidebar-brand__name">Sasha</p>
              <p className="sidebar-brand__sub">Gestión escolar</p>
            </>
          ) : (
            <p className="sidebar-brand__name" style={{ fontSize: '1rem' }}>
              S
            </p>
          )}
        </div>
        <nav className="sidebar-nav">
          {items.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + '/')
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`sidebar-nav__item${active ? ' sidebar-nav__item--active' : ''}`}
                title={item.label}
              >
                {ICONS[item.icon] ?? ICONS.home}
                {!collapsed ? <span>{item.label}</span> : null}
              </Link>
            )
          })}
        </nav>
        <div className="sidebar-footer">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
            {!collapsed ? ' Colapsar' : null}
          </button>
        </div>
      </aside>

      <div className="app-shell__main">
        <header className="app-shell__top">
          <div style={{ marginRight: 'auto', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <label className="texto-muted" style={{ fontSize: '0.8rem' }} htmlFor="active-role">
              Rol activo
            </label>
            <select
              id="active-role"
              className="field__select"
              value={session?.activeRole ?? ''}
              onChange={(e) => setActiveRole(e.target.value as RoleName)}
              data-testid="active-role-select"
            >
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
            <span className="badge" data-testid="session-code">
              {session?.code}
            </span>
          </div>

          <Can permission="notificaciones:get">
            <NotificationsBell />
          </Can>

          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => {
              const next = theme === 'dark' ? 'light' : 'dark'
              setTheme(next)
              document.documentElement.setAttribute('data-theme', next)
            }}
          >
            {theme === 'dark' ? 'Claro' : 'Oscuro'}
          </button>

          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setConfirmLogout(true)}
            data-testid="logout-button"
          >
            Salir
          </button>
        </header>
        <main className="app-shell__content">{children}</main>
      </div>

      <ConfirmDialog
        open={confirmLogout}
        title="Cerrar sesión"
        message="¿Seguro que deseas cerrar la sesión?"
        confirmLabel="Salir"
        onCancel={() => setConfirmLogout(false)}
        onConfirm={async () => {
          try {
            await logout()
          } catch (err) {
            toast.error(userMessageFromError(err))
          } finally {
            clearSession()
            setConfirmLogout(false)
            window.location.href = '/login'
          }
        }}
      />
    </div>
  )
}
