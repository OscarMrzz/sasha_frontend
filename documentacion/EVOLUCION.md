# Evolución del frontend Sasha

Última actualización: 04/09/2026

## 1. Estado global

| Fase | Descripción | Estado |
|------|-------------|--------|
| 0 | Fundación (auth, shell, API, gates, E2E smoke) | Completada |
| 1 | Configuración + catálogos | Completada |
| 2 | Usuarios, roles, permisos, personas | Completada |
| 3 | Matrícula | Completada |
| 4 | Asignación + horarios | Completada |
| 5 | Plan de estudio | Completada |
| 6 | Asistencia, tareas, calificaciones | Completada |
| 7 | Pagos | Completada |
| 8 | Notificaciones (pull), stats, SACE, auditoría | Completada |

## 2. Bitácora

### 2026-09-04 — Roles reales post-login

- Login ya no pide rol: usa `code`/`username`/`roles` del body de `POST /login/`.
- Selector del shell limitado a `knownRoles` del API; `activeRole` inicial = `roles[0]`.
- E2E actualizados (seed admin solo tiene `admin`).

### 2026-09-04 — Fundación + módulos PRD + E2E

**Infra**

- Proxy Vite/Nitro `/api` → `localhost:8080`
- `.env.example` + `.env` con `VITE_API_BASE_URL` / `VITE_API_PROXY_TARGET`
- Capas: `routes`, `components`, `services`, `helpers`, `hooks`, `lib`, `styles`, `tests/e2e`
- Tokens dark (sin negros puros), BEM, tipografía IBM Plex; sin degradados
- TanStack Query/Table, Zod, Playwright (`channel: chrome` si el download de Chromium falla)

**Páginas**

- `/login`, `/dashboard`
- `/configuracion`
- `/catalogos/{grados,modalidades,secciones,cursos,periodos}`
- `/usuarios`, `/controladores`, `/personas`
- `/matricula`, `/asignacion`, `/horarios`
- `/plan-estudio`, `/asistencia`, `/tareas`, `/calificaciones`
- `/pagos`, `/notificaciones-admin`, `/estadisticas`, `/sace`, `/auditoria`

**Componentes clave**

- `AppShell`, `NotificationsBell`, `Can` / `RequirePermission`
- `DataTable`, `Modal`, `ConfirmDialog`, `Field`
- Matriz de permisos `helpers/permissions.ts` (alineada a seed)

**Services**

- Auth, catálogos, configuración, users, personas, matrícula, asignación, horarios, plan, asistencia, tareas, calificaciones, pagos, notificaciones, estadísticas, SACE, bóveda, auditoría

**E2E** (15 passed)

- Smoke: health, redirect, login ok/fail, menú por rol
- Catálogos: abrir grados + crear grado
- Módulos: config, usuarios, navegación matrícula/horarios/pagos/SACE/stats, auditoría developer
- Permisos UI: developer / admin / maestro vs SACE

## 3. Mapa rutas ↔ permisos

| Ruta | Permiso mínimo UI |
|------|-------------------|
| /dashboard | autenticado |
| /configuracion | configuracion:get |
| /catalogos/* | catalogos:get |
| /usuarios | users:get |
| /controladores | users:put |
| /personas | personas:get |
| /matricula | matricula:get |
| /asignacion | asignacion:get |
| /horarios | horarios:get |
| /plan-estudio | planestudio:get |
| /asistencia | asistencia:get |
| /tareas | tareas:get |
| /calificaciones | calificaciones:get |
| /pagos | pagos:get |
| /notificaciones-admin | notificaciones:post |
| /estadisticas | estadisticas:get |
| /sace | sace:get |
| /auditoria | auditoria:get |

El menú lateral solo muestra ítems cuyo permiso cumple el **rol activo** (`X-Active-Role`).

## 4. Checklist E2E

- [x] Health vía proxy `/api/health`
- [x] Login inválido muestra error
- [x] Login válido (admin seed) → dashboard
- [x] Sin sesión → redirect `/login`
- [x] Menú respeta permisos del rol (smoke)
- [x] CRUD grado (admin) — crear vía UI
- [x] SACE visible solo con matriz sace:get (admin sí / maestro no)
- [x] Auditoría visible con rol developer en UI
- [ ] Alta usuario + PDF (ampliar suite)
- [ ] Matrícula / reingreso (ampliar suite)
- [ ] Horarios preview vs confirm (ampliar suite)

## 5. Deuda conocida

### Push de notificaciones en tiempo real — NO SOLUCIONADO

El backend solo expone REST (`GET/POST /notificaciones/`, marcar leída). **No hay WebSocket, SSE ni canal push.**

- **Frontend actual:** campana + panel con carga bajo demanda (pull al abrir).
- **Futuro (requiere permiso de backend — este FE no lo implementará sin ese permiso):** el backend debería añadir push (WebSocket/SSE o equivalente) para que una notificación “caiga sola” sin refrescar ni reabrir el panel.
- Hasta entonces, **no está garantizado** el comportamiento “de la nada sin actualizar”.

### Resolución user_id tras alta de usuario

`POST /users/` devuelve PDF + header `X-User-Code`, pero **no** expone el UUID (`user_id`) necesario para `POST /personas/*`. La UI pide el UUID manualmente. Ideal (backend futuro): header `X-User-Id`.

### CORS

Mitigado en local con proxy Vite/Nitro; no se modificó el backend.

### Cómo levantar stack local

```bash
# backend (solo contenedores + go run; no editar archivos backend)
cd backend_sasha
docker compose up -d
# DB_PASSWORD del compose es 1234 — exportar env al correr Go si .env difiere
go run main.go

# frontend
cd sasha_fronted
pnpm install
pnpm dev
pnpm test:e2e
```
