import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import {
  Award,
  Bell,
  BookOpen,
  Calendar,
  CalendarCheck,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  ClipboardList,
  Clock,
  Download,
  FileText,
  Gavel,
  Home,
  Layers,
  LayoutGrid,
  LayoutDashboard,
  Link2,
  ListTodo,
  LogOut,
  Menu,
  Moon,
  Network,
  PanelLeftClose,
  PanelLeft,
  Receipt,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldPlus,
  Sun,
  Unlock,
  User,
  Users,
  Wallet,
  BarChart3,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState  } from 'react'
import type {ReactNode} from 'react';
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
  'shield-alert': <ShieldAlert className="sidebar-nav__icon" />,
  gavel: <Gavel className="sidebar-nav__icon" />,
  network: <Network className="sidebar-nav__icon" />,
  'calendar-check': <CalendarCheck className="sidebar-nav__icon" />,
  'shield-plus': <ShieldPlus className="sidebar-nav__icon" />,
  refresh: <RefreshCw className="sidebar-nav__icon" />,
}

export function AppShell({ children }: { children: ReactNode }) {
  const { session, clearSession } = useSession()
  const { can, roles } = useCan()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isHubLauncher =
    ['/maestro', '/maestro/analiticas', '/maestro/sace', '/alumno', '/alumno/resultados', '/responsable', '/mi-perfil'].includes(
      pathname.replace(/\/$/, ''),
    ) ||
    pathname.startsWith('/hijo/')
  const maestro = isMaestroRole(roles)
  const portal = isPortalRole(roles)
  const portalClase = usePortalClase()
  const [collapsed, setCollapsed] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
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
      hideForRoles?: readonly string[]
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
    return base.filter(
      (i) =>
        (i.permission ? can(i.permission) : true) &&
        !i.hideForRoles?.some((r) => roles.includes(r)),
    )
  }, [can, roles, maestro, portal, navigate])

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

  useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileNavOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false)
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [mobileNavOpen])

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

  const renderNavItems = (showLabels: boolean, onNavigate?: () => void) =>
    items.map((item) => {
      const isDashboard = item.label === 'Dashboard'
      const active = isDashboard
        ? pathname.startsWith('/maestro/clases/')
        : pathname === item.to ||
          (pathname.startsWith(item.to + '/') &&
            !items.some((o) => o.to.startsWith(item.to + '/') && pathname.startsWith(o.to)))
      if (item.onClick) {
        const onClick = item.onClick
        return (
          <button
            key={item.label}
            type="button"
            className={`sidebar-nav__item${active ? ' sidebar-nav__item--active' : ''}`}
            title={item.label}
            data-testid="nav-dashboard"
            onClick={() => {
              onClick()
              onNavigate?.()
            }}
          >
            {ICONS[item.icon] ?? ICONS.home}
            {showLabels ? <span>{item.label}</span> : null}
          </button>
        )
      }
      return (
        <Link
          key={item.to}
          to={item.to}
          className={`sidebar-nav__item${active ? ' sidebar-nav__item--active' : ''}`}
          title={item.label}
          onClick={onNavigate}
        >
          {ICONS[item.icon] ?? ICONS.home}
          {showLabels ? <span>{item.label}</span> : null}
        </Link>
      )
    })

  const closeMobileNav = () => setMobileNavOpen(false)

  return (
    <div
      className={`app-shell${isHubLauncher ? ' app-shell--hub' : ''}${collapsed && !isHubLauncher ? ' app-shell--sidebar-collapsed' : ''}`}
      data-theme={theme}
    >
      <header className="app-shell__top">
        <button
          type="button"
          className="app-shell__burger"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={mobileNavOpen}
          aria-controls="mobile-nav"
          data-testid="mobile-nav-open"
        >
          <Menu size={22} />
        </button>
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
        </div>

        {maestro || portal ? (
          <button
            type="button"
            className="user-panel user-panel--top app-shell__top-desktop"
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

        <div className="app-shell__top-user app-shell__top-desktop" ref={userMenuRef}>
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

        <Can permission="notificaciones:get">
          <NotificationsBell />
        </Can>
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

            <nav className="sidebar-nav">{renderNavItems(!collapsed)}</nav>
          </aside>
        ) : null}

        <main className="app-shell__content">{children}</main>
      </div>

      <div
        className={`mobile-nav${mobileNavOpen ? ' mobile-nav--open' : ''}`}
        aria-hidden={!mobileNavOpen}
        inert={!mobileNavOpen}
      >
        <div className="mobile-nav__backdrop" onClick={closeMobileNav} data-testid="mobile-nav-backdrop" />
        <aside
          id="mobile-nav"
          className="mobile-nav__panel"
          aria-label="Menú"
          role="dialog"
          aria-modal="true"
          data-testid="mobile-nav"
        >
          <div className="mobile-nav__head">
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
            <button
              type="button"
              className="mobile-nav__close"
              onClick={closeMobileNav}
              aria-label="Cerrar menú"
              data-testid="mobile-nav-close"
            >
              <X size={18} />
            </button>
          </div>

          {portal && portalClase && !isHubLauncher ? (
            <div className="sidebar-clase" title={portalClase.cursoNombre}>
              <BookOpen size={14} />
              <span>{portalClase.cursoNombre}</span>
            </div>
          ) : null}

          <nav className="sidebar-nav mobile-nav__list">
            {maestro || portal ? (
              <button
                type="button"
                className="sidebar-nav__item"
                onClick={() => {
                  goInicio()
                  closeMobileNav()
                }}
              >
                <Home className="sidebar-nav__icon" />
                <span>Inicio</span>
              </button>
            ) : null}
            {maestro && can('mis_estadisticas:get') ? (
              <button
                type="button"
                className={`sidebar-nav__item${pathname.startsWith('/maestro/analiticas') ? ' sidebar-nav__item--active' : ''}`}
                onClick={() => {
                  void navigate({ to: '/maestro/analiticas', search: { agrupar: undefined, filtros: undefined } })
                  closeMobileNav()
                }}
              >
                <BarChart3 className="sidebar-nav__icon" />
                <span>Analíticas</span>
              </button>
            ) : null}
            {!isHubLauncher ? renderNavItems(true, closeMobileNav) : null}
          </nav>

          <div className="mobile-nav__foot">
            <Link
              to="/mi-perfil"
              className="sidebar-nav__item"
              onClick={closeMobileNav}
            >
              <User className="sidebar-nav__icon" />
              <span>Mi perfil</span>
            </Link>
            <button type="button" className="sidebar-nav__item" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="sidebar-nav__icon" /> : <Moon className="sidebar-nav__icon" />}
              <span>{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
            </button>
            <button
              type="button"
              className="sidebar-nav__item mobile-nav__danger"
              onClick={() => {
                closeMobileNav()
                setConfirmLogout(true)
              }}
            >
              <LogOut className="sidebar-nav__icon" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </aside>
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
