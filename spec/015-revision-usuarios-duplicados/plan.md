# Plan de Especificación: Prevención y revisión de usuarios duplicados — Frontend

> Feature `015-revision-usuarios-duplicados` · Frontend Sasha (React 19 + TanStack Start) · v1
> Capa: **frontend** (`sasha_fronted/`). Espejo de la spec backend
> `backend_sasha/spec/007-prevencion-y-revision-usuarios-duplicados/plan.md`.
> Cierra: (A) doble/triple submit en los formularios de alta y (B) página para **inspeccionar** y
> **desactivar** cuentas duplicadas conservando la que tiene actividad.
> Reglas: [[REG-UI-11]] (buscador «Buscar…»), [[REG-UI-12]] (vista de registros), [[REG-UI-01]]
> (tokens, **sin degradados**), [[REG-UI-04]] (modal + confirmación), [[REG-UI-06]] (menú de fila),
> [[REG-UI-14]] (un botón Descargar con desplegable), [[REG-UI-16]] (CRUD si hay Agregar).
>
> **Modelo mental:** "un usuario = un rol" ⇒ **misma persona + distinto rol = 2 cuentas
> intencionales** (no se marcan). Solo es duplicado **misma persona + MISMO rol**.

---

## 1. Objetivo

- **A. Prevención (O1/O3/O4):**
  - Bloquear doble/triple submit en **todos** los puntos de alta (botón deshabilitado mientras crea,
    diálogo que se cierra en error).
  - Enviar `Idempotency-Key` en el alta (reusada en el reintento) para que un reintento no cree otra cuenta.
  - **Avisar** (no bloquear) cuando ya existe una cuenta con los mismos datos **y el mismo rol**;
    el operador decide "crear igual" o cancelar.
- **B. Página "Duplicados" (O6):** listado de grupos sospechosos + vista de inspección en paralelo
  (A/B/C) con recomendación de conservar/eliminar, botón de eliminar por versión y "Conservar todas".

## 2. Alcance

**En alcance:**
- `src/routes/_app/usuarios.tsx`: `confirmDisabled` en el `ConfirmDialog` de alta; `Idempotency-Key`;
  aviso de duplicado con `GET /users/chequear-duplicado`.
- `src/routes/_app/matricula.tsx` (reingreso): `confirmDisabled` en su `ConfirmDialog` y en su botón.
- `src/components/matricula/MatriculaWizard.tsx`: verificar que ya bloquea (lo hace) y que el reintento
  usa la misma `Idempotency-Key` por alta.
- `src/services/users.ts` + `src/lib/api.ts`: soporte de `Idempotency-Key`.
- **Página nueva** `src/routes/_app/duplicados.tsx` (estilo registros REG-UI-12) + servicio
  `src/services/duplicados.ts`.
- Registro en `src/helpers/nav.ts` + icono en `nav-icons.tsx`; permisos en `permissions.ts` si faltan.
- e2e Playwright.

**Fuera de alcance:**
- Backend/DB (ver spec 007). No se toca `username` como UNIQUE.
- Reasignación/merge de vínculos (solo **desactivar** la versión duplicada).
- Endpoint atómico de matrícula.

## 3. UI

### 3.1 Poka-Yoke (O1)
- **`usuarios.tsx`:** pasar `confirmDisabled={createMut.isPending}` al `ConfirmDialog` de creación
  (hoy ausente) y `setConfirmSave(false)` en `onError`. Aplicar el mismo patrón al alta de reingreso
  en `matricula.tsx` (botón + diálogo).
- Regla general: **ningún** `ConfirmDialog` que dispare una creación puede quedar clicable en vuelo.

### 3.2 Idempotencia (O3)
- `apiRequest` acepta `headers`; `createUser` envía `Idempotency-Key` (UUID v4 generado **una vez por
  intento lógico**, reusado si el usuario reintenta tras un fallo de red).
- La clave vive en el estado del formulario hasta el éxito o la cancelación.

### 3.3 Aviso de duplicado (O4)
- Al pulsar "Crear y descargar PDF" (o antes de confirmar), el front llama
  `GET /users/chequear-duplicado` con los datos + rol.
- Si `existe=true`: `ConfirmDialog`/`Modal` de aviso **"Ya existe una cuenta <rol> con estos datos:
  <lista .code>."** con acciones **"Crear igual"** y **"Cancelar"**. Con rol distinto no avisa.
- Solo aplica cuando hay datos suficientes (nombre o identidad). Si la consulta falla, se **continúa**
  (no bloquear el alta por un chequeo best-effort).

### 3.4 Página "Duplicados" (O6) — estilo registros (REG-UI-12)
- **Ruta:** `src/routes/_app/duplicados.tsx` → `/duplicados`. `RequirePermission permission="users:get"`.
  `data-testid="duplicados-page"`.
- **DataTable** con `title="Duplicados"` (conteo "N grupos"), buscador «Buscar…», filtros (rol, estado,
  señal, nº de versiones), Descargar Excel/PDF (`exportRows`+`exportFilename`).
- **Columnas (una fila = un grupo):** `#` · Nombre · Rol · N.º versiones · Vínculos totales ·
  Identidad · Username(s) · Creado (rango) · Estado(s) · Señal. Orden por defecto: versiones ↓,
  vínculos ↓, fecha ↓.
- **Menú de fila** (`.ctx-menu`): **Inspeccionar** (`duplicados-ctx-inspeccionar`). Doble clic = Inspeccionar.

### 3.5 Vista de inspección en paralelo
- Abre un `Modal board` (`min(90vw,1400px)`) con una rejilla de **tarjetas por versión** (una columna
  por versión, A/B/C; adaptable a 1 columna en pantallas pequeñas, patrón `.recibo-validar`).
- **Cada tarjeta:** etiqueta grande **A/B/C**; badge verde **"Se recomienda conservar"** o rojo
  **"Se recomienda eliminar"** (tokens `--sasha-success`/`--sasha-danger`; **sin degradados**);
  datos (code, username, nombre, identidad, estado, fecha), **desglose de vínculos** por tipo y
  `total_vinculos`; botón **"Eliminar cuenta"** (`btn--danger`, `dup-eliminar-<etiqueta>`).
- **Cabecera del modal:** título con el grupo y botón **"Conservar todas"**
  (`btn`, `dup-conservar-todas`) que cierra el modal sin cambios.
- **Eliminar cuenta:** `ConfirmDialog danger`; si es la **recomendada a conservar**, la confirmación
  es **reforzada** (avisa que es la de más vínculos). Llama `POST /users/duplicados/desactivar`;
  refresca el grupo; en **409** muestra el vínculo bloqueante en un `Modal` "No se puede eliminar".
- Si tras eliminar quedan <2 versiones, el grupo desaparece del listado.

## 4. Archivos a tocar

| Archivo | Cambio |
|---|---|
| `src/lib/api.ts` | `apiRequest` acepta `headers` arbitrarios (para `Idempotency-Key`). |
| `src/services/users.ts` | `createUser` recibe/envía `Idempotency-Key`; `chequearDuplicado(...)`. |
| `src/services/duplicados.ts` | **Nuevo**: `listGruposDuplicados`, `detalleGrupo(clave)`, `desactivarCuenta(code)`, `reactivarCuenta(code)`. |
| `src/routes/_app/usuarios.tsx` | `confirmDisabled` en el ConfirmDialog de alta; `Idempotency-Key`; `onError` cierra el diálogo; aviso de duplicado (O4). |
| `src/routes/_app/matricula.tsx` | `confirmDisabled` en el ConfirmDialog y botón de reingreso. |
| `src/components/matricula/MatriculaWizard.tsx` | Reusar la misma `Idempotency-Key` por alta en el reintento (ya tiene `confirmDisabled`). |
| `src/routes/_app/duplicados.tsx` | **Nuevo**: página estilo registros + modal de inspección. |
| `src/helpers/nav.ts` | Nuevo ítem `{ to:'/duplicados', label:'Duplicados', permission:'users:get', icon:'copy' }`. |
| `src/components/layout/nav-icons.tsx` | Registrar icono (`copy`/`users`); si no existe, usar uno existente. |
| `src/helpers/permissions.ts` | Verificar que `users:get`/`users:delete` existen en los roles de gestión; si falta, agregarlos. |
| `src/tests/e2e/duplicados.spec.ts` | **Nuevo**: bloqueo de doble submit + flujo de inspección/eliminar/conservar. |

Notas:
- No se alteran `data-testid` existentes del alta (para no romper e2e).
- La página es de **solo lectura + acción explícita**; nunca elimina automáticamente.

## 5. Contratos / tipos

- `GrupoDuplicado` (lista): `clave, nombre, roles[], versiones, vinculos_total, identidad, usernames[],
  senal, creado_desde, creado_hasta, estados[]`.
- `GrupoDetalle`: `grupo{...}`, `versiones: VersionDuplicado[]`.
- `VersionDuplicado`: `etiqueta, code, username, nombre, identidad, status, creado, ultima_actividad,
  vinculos_total, vinculos:{tipo,cantidad}[], recomendacion:'conservar'|'eliminar'`.
- `ChequearDuplicadoResponse`: `{ existe: boolean, versiones: {...}[] }`.

## 6. Reglas aplicadas (REG-UI)

- **REG-UI-12** (registros): una `DataTable` con buscador, filtros, Descargar y conteo en el título.
- **REG-UI-11**: el buscador dice «Buscar…» (lo impone `SearchInput`).
- **REG-UI-01**: tokens sólidos, **sin degradados** (badges verde/rojo con `--sasha-success/danger`).
- **REG-UI-04/06**: modales con confirmación; menú de fila con Ver/Inspeccionar.
- **REG-UI-14**: un botón "Descargar" con desplegable Excel/PDF.

## 7. Tests

- `pnpm generate-routes`; `pnpm exec tsc --noEmit`; `eslint` de los archivos tocados.
- **e2e (Playwright, REG-TST-03):** `duplicados.spec.ts`:
  1. Doble clic rápido en "Confirmar" del alta → se crea **una** cuenta (verificar conteo).
  2. Aviso de duplicado cuando existe misma persona+rol (aparece el diálogo; "Cancelar" no crea).
  3. Página Duplicados: sembrar 2 cuentas iguales → la fila aparece; "Inspeccionar" muestra A/B/C con
     badges; "Eliminar cuenta" de la vacía la desactiva; "Conservar todas" no cambia nada.
  - Requiere backend `:8081` + DB `molde_test`; si no están, se documenta como no ejecutado.

## 8. Decisiones (aprobadas)

1. Avisar, no bloquear (permite homónimos legítimos con traza).
2. Ver con `users:get`; eliminar/restaurar con `users:delete`.
3. "Eliminar duplicado" = desactivar (reversible), con confirmación reforzada en la recomendada.
4. "Conservar todas" siempre disponible.
5. Nunca borrado automático.

## 9. Cierre

- **No requiere migración** en esta capa (la migración es del backend, spec 007).
- Al terminar, **preguntar** si se actualiza el **MAPA** de frontend
  (`sasha_fronted/documentacion/MAPA.md`) y si se marcan las notas del vault. **No editar en silencio.**
- Coordinar con el backend `007` (endpoints y `Idempotency-Key`).
