# Plan de Especificación: Modo mantenimiento (pantalla + botón del dev) - Frontend

## 1. Objetivo

Cuando el backend está en mantenimiento, **todos** los usuarios (incluido admin) son llevados a una
**pantalla de mantenimiento**, incluso si ya estaban dentro de la app; y quien visita el dominio la
ve. El rol **`developer`** tiene una página con un **interruptor** para activar/desactivar (con
confirmación fuerte).

## 2. Contexto actual (verificado)

- `__root.tsx:24-30` (`RootComponent`) envuelve **todo** (público y privado) en `AppProviders`.
  `AppShell` (solo `_app`) es el contenedor de rutas autenticadas.
- Guard de sesión en `_app.tsx:8-12` (`beforeLoad` con `hasPersistedSession`). **No se re-ejecuta** al
  navegar dentro de la app → no basta para "aunque ya estén dentro".
- Cliente HTTP `src/lib/api.ts`: `apiRequest` (`:61-133`); el 401 se maneja en `:92-94` con
  `handleUnauthorized` (`:47-59`, con flag anti-bucle y `window.location.assign('/login') :57-58`).
  `apiErrorSchema` (`:4-8`) ya parsea `{message, code, status}`. `mensajePorEstado` (`:159-168`).
- Sesión: `localStorage['sasha.session']`, `use-session.tsx`; rol activo = `knownRoles[0]`,
  header `X-Active-Role` (`api.ts:70-72`). Servicios en `src/services/`.
- Rutas públicas: archivos directos en `src/routes/` (p. ej. `login.tsx`) sin `_app`. El layout `_app`
  exige sesión.
- Rol `developer` existe en `helpers/permissions.ts:15` (permisos `:291`) pero **sin ruta ni ítem de
  menú**. El `Switch` de `/controladores` (`controladores.tsx:18-45`) es el componente ideal para el toggle.
- SSE: `use-notificaciones-stream.ts` solo en `NotificationsBell` (dentro de `_app`, tras permiso
  `notificaciones:get`) → no sirve tal cual para mantenimiento global.
- No hay página 404/500 propia.

## 3. Diseño

### 3.1 Servicio `src/services/mantenimiento.ts`

- `getEstadoMantenimiento()` → `GET /mantenimiento` (público; sin `X-Active-Role`).
- `setMantenimiento({activo, motivo, mensaje})` → `PUT /mantenimiento` (con sesión + `X-Active-Role`).

### 3.2 Provider + watcher global

- `MantenimientoProvider` con `{ activo, estado, refrescar() }`; se monta en `AppProviders.tsx`.
- Sondeo cada ~15 s de `GET /mantenimiento` (cubre "ya estaba adentro" sin tráfico) + chequeo al
  montar.
- **Watcher** en `__root.tsx` `RootComponent`: si `activo` y `pathname !== '/mantenimiento'` →
  `window.location.assign('/mantenimiento')` (navegación dura, imposible de esquivar). **Excepción:**
  si el rol guardado es `developer`, no redirige (para poder apagar desde la web).

### 3.3 Detección por respuesta 503

- En `api.ts`, junto al 401 (`:92-94`): si `res.status === 503` y el `code` (parseado de
  `apiErrorSchema`) es `'MANTENIMIENTO'` → `handleMaintenance()` (espejo de `handleUnauthorized`, con
  flag anti-bucle y `window.location.assign('/mantenimiento')`). En los dos branches de error
  (raw `:97-114`, normal `:124-130`). **Discriminar** de los `STORAGE_*` (también 503). No redirigir
  si ya se está en `/mantenimiento`.

### 3.4 Pantalla pública `src/routes/mantenimiento.tsx`

- `createFileRoute('/mantenimiento')`, `ssr:false`, sin guard ni `AppShell`.
- Muestra mensaje/motivo del estado; **auto-reintento**: sondea `GET /mantenimiento` y, cuando
  `activo=false`, redirige a `/login`.
- Se regenera `routeTree.gen.ts` (`pnpm generate-routes`).

### 3.5 Botón del `developer`

- Permiso `mantenimiento:put` para el rol `developer` en `helpers/permissions.ts`.
- Ítem de menú (solo `developer`) en `helpers/nav.ts`.
- Ruta `src/routes/_app/mantenimiento-admin.tsx`: `Switch` (patrón `/controladores`) + campos
  `motivo`/`mensaje` + **confirmación fuerte** («Esto bloqueará a TODOS los usuarios, incluido admin»).
  Avisa que el apagado **global** (todos los clientes) es por el script.
- Restringido a `developer` (`RequirePermission`/`Can`).

### 3.6 MAPA

- Actualizar `documentacion/MAPA.md` (nueva ruta pública `/mantenimiento` + `/mantenimiento-admin`).

## 4. Contratos

Consume `GET /mantenimiento` y `PUT /mantenimiento` del backend. Reacciona a 503 con `code=MANTENIMIENTO`.

## 5. Riesgos

- El watcher usa `window.location.assign` (recarga completa) para no ser esquivado; no romper la
  navegación normal cuando `activo=false`.
- No confundir el 503 de mantenimiento con el de bóveda (`STORAGE_*`).
- No bloquear al `developer` (o perderíamos el botón).

## 6. Tests

- E2E (Playwright): con el backend en mantenimiento, una ruta autenticada redirige a `/mantenimiento` y
  el login también; al desactivar, vuelve. (Puede simularse con el endpoint/estado de prueba.)
- Verificar `tsc --noEmit` + `pnpm run build`.

## 7. Fuera de alcance

- Botón de UI para el apagado **global** de todos los clientes (es el CLI `--all`).
- Aviso en tiempo real por SSE (se usa sondeo + 503).
- Mantenimiento programado/nocturno automático.
