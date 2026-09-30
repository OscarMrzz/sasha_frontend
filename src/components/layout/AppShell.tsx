import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import {
  Award,
  Bell,
  BookOpen,
  Calendar,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  ClipboardList,
  Clock,
  Download,
  FileText,
  Home,
  Layers,
  LayoutGrid,
  LayoutDashboard,
  Link2,
  ListTodo,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeft,
  Receipt,
  Search,
  Settings,
  Shield,
  Sun,
  Unlock,
  User,
  Users,
  Wallet,
  BarChart3,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Can, useCan } from '#/components/gates/Can'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { NotificationsBell } from '#/components/layout/NotificationsBell'
import { NAV_ITEMS } from '#/helpers/nav'
import { useSession } from '#/hooks/use-session'
import { userMessageFromError } from '#/lib/api'
import { homePathForRoles, isMaestroRole, isPortalRole, isResponsableRole } from '#/lib/home-path'
import { readLastAsignacionId } from '#/lib/last-asignacion'
import { clearPortalContext, usePortalClase } from '#/lib/portal-context'
import { logout } from '#/services/auth'
import { toast } from 'sonner'
import { useBovedaImage } from '#/hooks/use-boveda-image'

const ICONS: Record<string, ReactNode> = {
  home: <Home className="sidebar-nav__icon" />,
  dashboard: <LayoutDashboard className="sidebar-nav__icon" />,
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
  unlock: <Unlock className="sidebar-nav__icon" />,
  wallet: <Wallet className="sidebar-nav__icon" />,
  receipt: <Receipt className="sidebar-nav__icon" />,
  bell: <Bell className="sidebar-nav__icon" />,
  chart: <BarChart3 className="sidebar-nav__icon" />,
  download: <Download className="sidebar-nav__icon" />,
  search: <Search className="sidebar-nav__icon" />,
}

export function AppShell({ children }: { children: ReactNode }) {
  const { session, clearSession } = useSession()
  const { can, roles } = useCan()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isHubLauncher =
    ['/maestro', '/alumno', '/alumno/resultados', '/responsable', '/mi-perfil'].includes(
      pathname.replace(/\/$/, ''),
    ) ||
    pathname.startsWith('/hijo/')
  const maestro = isMaestroRole(roles)
  const portal = isPortalRole(roles)
  const portalClase = usePortalClase()
  const [collapsed, setCollapsed] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof document === 'undefined') return 'dark'
    return (document.documentElement.getAttribute('data-theme') as 'dark' | 'light') || 'dark'
  })
  const fotoSrc = useBovedaImage(session?.fotoKey)

  const items = useMemo(() => {
    type Item = {
      to: string
      label: string
      permission: (typeof NAV_ITEMS)[number]['permission'] | null
      icon: string
      onClick?: () => void
    }
    const home: Item = maestro
      ? {
          to: '/maestro/clases/$asignacionId',
          label: 'Dashboard',
          permission: null,
          icon: 'dashboard',
          onClick: () => {
            const id = readLastAsignacionId()
            if (!id) {
              toast.message('Elige una clase desde Inicio')
              void navigate({ to: '/maestro' })
              return
            }
            void navigate({
              to: '/maestro/clases/$asignacionId',
              params: { asignacionId: id },
            })
          },
        }
      : { to: '/dashboard', label: 'Inicio', permission: null, icon: 'home' }
    const rest = NAV_ITEMS.filter((i) => i.to !== '/dashboard')
    const base: Item[] = portal ? rest : [home, ...rest]
    return base.filter((i) => (i.permission ? can(i.permission) : true))
  }, [can, maestro, portal, navigate])

  useEffect(() => {
    if (!userMenuOpen) return
    const onPointer = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [userMenuOpen])

  const panelTitle = session?.username
    ? `${session.username} · ${session.code}`
    : session?.code || 'Usuario'

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
  }

  const goInicio = () => {
    if (isResponsableRole(roles)) {
      void navigate({ to: '/responsable' })
      return
    }
    void navigate({ to: maestro ? '/maestro' : portal ? homePathForRoles(roles) : '/dashboard' })
  }

  return (
    <div
      className={`app-shell${isHubLauncher ? ' app-shell--hub' : ''}${collapsed && !isHubLauncher ? ' app-shell--sidebar-collapsed' : ''}`}
      data-theme={theme}
    >
      <header className="app-shell__top">
        <div className="app-shell__top-brand" data-testid="maestro-hub-brand">
          <button
            type="button"
            className="app-shell__top-brand-name"
            data-testid="top-brand-sasha"
            onClick={goInicio}
            title="Inicio"
          >
            Sasha
          </button>
          <span className="badge" data-testid="session-code">
            {session?.code}
          </span>
        </div>

        <Can permission="notificaciones:get">
          <NotificationsBell />
        </Can>

        {maestro || portal ? (
          <button
            type="button"
            className="user-panel user-panel--top"
            data-testid="top-inicio"
            onClick={goInicio}
            title="Inicio"
          >
            <span className="user-panel__avatar" aria-hidden>
              <Home size={16} />
            </span>
            <span className="user-panel__meta">
              <span className="user-panel__name">Inicio</span>
            </span>
          </button>
        ) : null}

        <div className="app-shell__top-user" ref={userMenuRef}>
          {userMenuOpen ? (
            <div className="user-menu" role="menu" data-testid="user-menu">
              <Link
                to="/mi-perfil"
                className="user-menu__item"
                role="menuitem"
                onClick={() => setUserMenuOpen(false)}
                data-testid="user-menu-profile"
              >
                <User size={15} />
                <span>Mi perfil</span>
              </Link>
              <button
                type="button"
                className="user-menu__item"
                role="menuitem"
                data-testid="theme-toggle"
                onClick={() => {
                  toggleTheme()
                  setUserMenuOpen(false)
                }}
              >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                <span>{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
              </button>
              <button
                type="button"
                className="user-menu__item user-menu__item--danger"
                role="menuitem"
                onClick={() => {
                  setUserMenuOpen(false)
                  setConfirmLogout(true)
                }}
                data-testid="logout-button"
              >
                <LogOut size={15} />
                <span>Cerrar sesión</span>
              </button>
            </div>
          ) : null}

          <button
            type="button"
            className={`user-panel user-panel--top${userMenuOpen ? ' user-panel--open' : ''}`}
            onClick={() => setUserMenuOpen((o) => !o)}
            aria-expanded={userMenuOpen}
            aria-haspopup="menu"
            data-testid="user-panel"
            title={panelTitle}
          >
            <span className="user-panel__avatar" aria-hidden>
              {fotoSrc ? (
                <img src={fotoSrc} alt="" className="user-panel__avatar-img" />
              ) : (
                <User size={16} />
              )}
            </span>
            <span className="user-panel__meta">
              <span className="user-panel__name">{session?.username || 'Usuario'}</span>
              <span className="user-panel__code">{session?.code}</span>
            </span>
            <ChevronDown
              size={14}
              className={`user-panel__chevron${userMenuOpen ? ' user-panel__chevron--open' : ''}`}
            />
          </button>
        </div>
      </header>

      <div className="app-shell__body">
        {!isHubLauncher ? (
          <aside
            className={`app-shell__sidebar${collapsed ? ' app-shell__sidebar--collapsed' : ''}`}
            aria-label="Navegación principal"
          >
            <div className="sidebar-toolbar">
              <button
                type="button"
                className="sidebar-toolbar__collapse"
                onClick={() => setCollapsed((c) => !c)}
                aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
                title={collapsed ? 'Expandir' : 'Colapsar'}
                data-testid="sidebar-collapse"
              >
                {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
              </button>
            </div>

            {portal && portalClase ? (
              <div
                className="sidebar-clase"
                title={portalClase.cursoNombre}
                data-testid="sidebar-clase"
              >
                <BookOpen size={14} />
                {!collapsed ? <span>{portalClase.cursoNombre}</span> : null}
              </div>
            ) : null}

            <nav className="sidebar-nav">
              {items.map((item) => {
                const isDashboard = item.label === 'Dashboard'
                const active = isDashboard
                  ? pathname.startsWith('/maestro/clases/')
                  : pathname === item.to || pathname.startsWith(item.to + '/')
                if (item.onClick) {
                  return (
                    <button
                      key={item.label}
                      type="button"
                      className={`sidebar-nav__item${active ? ' sidebar-nav__item--active' : ''}`}
                      title={item.label}
                      data-testid="nav-dashboard"
                      onClick={item.onClick}
                    >
                      {ICONS[item.icon] ?? ICONS.home}
                      {!collapsed ? <span>{item.label}</span> : null}
                    </button>
                  )
                }
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
          </aside>
        ) : null}

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
            clearPortalContext()
            setConfirmLogout(false)
            window.location.href = '/login'
          }
        }}
      />
    </div>
  )
}
