# Evolución del frontend Sasha

Mapa de módulos y flujos: [`MAPA.md`](MAPA.md).

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

### 2026-09-05 — Controladores: roles y usuarios con switches

- Sección activación de roles (GET/PUT `/roles/`) con interruptor verde.
- Sección usuarios: tabla código/username + switch activo, buscador y filtro Activo/Desactivado.

### 2026-09-05 — Sin parpadeo login↔dashboard al refrescar

- Causa: SSR no ve `localStorage` y `beforeLoad` mandaba a `/login`; el cliente corregía después.
- Rutas `/`, `/login`, `/_app` con `ssr: false` + chequeo de sesión solo en cliente.

### 2026-09-05 — Usuarios como tabla + modal

- `GET /users/` lista usuarios activos.
- Pantalla Usuarios: DataTable (filtros username/rol/estado, Excel, agregar) y alta/edición en modal (PDF al crear).

### 2026-09-05 — Tablas: filtros, orden, # y 25 filas

- `DataTable`: buscador + filtros clave (nunca por código), orden al clic en cabecera, columna `#`, paginación 25, conteo sutil junto al título.
- Aplicado en catálogos, personas, matrícula, asignación, pagos, notificaciones, auditoría, tareas, calificaciones y horarios.

### 2026-09-05 — Calendario por modalidad (no institucional)

- Configuración institucional: solo nombre, `codigo_sace` y umbrales de nota.
- En cada modalidad (turno): duración hora/periodo/parcial, recreos.
- Programa SACE (`modalidad_sace`) en **Configuración**.
- Horarios y export SACE leen esos datos desde la modalidad de la sección.

### 2026-09-05 — Panel de usuario y colapso sutil

- Colapsar menú: icono discreto arriba del sidebar (ya no en el footer).
- Footer del sidebar: panel de usuario (avatar, nombre, código) con menú → Mi perfil / Cerrar sesión.
- Nueva ruta `/mi-perfil`: cambio de contraseña propia (`PUT /password/`) y foto (`POST /boveda/upload` tipo `perfil_foto`).
- “Salir” eliminado del topbar; queda en el menú del usuario.

### 2026-09-05 — Roles internos sin combobox

- Sin selector de rol en login ni en el shell.
- Esta app envía todos los `roles` del login en `X-Active-Role` (coma-separados).
- UI y API usan unión de permisos; otra app (p. ej. padres) podrá filtrar roles al arrancar.

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
- `/usuarios`, `/controladores` (personas unificado en usuarios; `/personas` redirige)
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
| /mi-perfil | autenticado |
| /configuracion | configuracion:get |
| /catalogos/* | catalogos:get |
| /usuarios | users:get (alta crea también perfiles persona según rol) |
| /controladores | users:put |
| /personas | redirige a /usuarios |
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

### Resolución user_id tras alta de usuario — RESUELTO

`POST /users/` responde PDF + headers `X-User-Code` y `X-User-Id`. Al crear un usuario con rol alumno/maestro/responsable, el panel **Usuarios** crea automáticamente el perfil en `/personas/*`. El menú **Personas** se eliminó; `/personas` redirige a `/usuarios`.

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
