# Plan de Especificación: Actualizaciones del sistema — Frontend

> Feature `025-actualizaciones-sistema` · Frontend Sasha (React 19 + TanStack Start) · v1
> Capa: **frontend** (`sasha_fronted/`).
> Contrato autoritativo: `backend_sasha/spec/017-actualizaciones-sistema/plan.md`.
> Estado: **propuesta para implementación**.
> Reglas del repo: sin degradados; solo tokens `--sasha-*`; buscador «Buscar…» (`REG-UI-11`);
> permisos con `Can`/`useCan`; `data-testid` en acciones; modales `Modal`/`Field`/`ConfirmDialog`.

---

## 0. Metadatos

| Campo | Valor |
|---|---|
| Feature | `025-actualizaciones-sistema` |
| Capa | Frontend |
| Spec backend autoritativa | `017-actualizaciones-sistema` |
| Ruta nueva | `/actualizaciones` |
| Roles que la usan | `admin`, `admin_temporal` (solo lectura) y `developer` (CRUD) |
| Permisos | `actualizaciones:get` (los tres) · `actualizaciones:post|put|delete` (developer) |
| No incluye | Backend, migración, app Flutter, notificaciones |
| Fecha | 2026-11-04 |

---

## 1. Contexto y problema

Admin y admin temporal no tienen una vista dentro de la app que les muestre en qué está trabajando el equipo. El
ticket pide una página nueva, en formato de cards, con todas las actualizaciones del sistema y su etapa:
**pendiente**, **en desarrollo**, **etapa de pruebas** y **finalizado**.

El developer es quien crea y edita las actualizaciones; admin y admin temporal solo las consultan.

---

## 2. Historia de usuario y criterios de aceptación

### 2.1 Historia principal

Como **admin o admin temporal**, quiero **ver una página con todas las actualizaciones del sistema agrupadas por etapa**,
para **saber en qué se está trabajando**, sin poder modificarlas.

Como **developer**, quiero **crear, editar y eliminar actualizaciones** desde esa misma página, para **mantener el
roadmap al día**.

### 2.2 Criterios de aceptación

- **Dado** un usuario `admin` o `admin_temporal`, **cuando** entra a `/actualizaciones`, **entonces** ve la rejilla de
  cards con las actualizaciones agrupadas por etapa y **no** ve botones de crear/editar/eliminar.
- **Dado** un usuario `developer`, **cuando** entra a `/actualizaciones`, **entonces** ve el botón «Agregar actualización»
  y el menú de cada card con Editar/Eliminar.
- **Dado** cualquier rol con `actualizaciones:get`, **entonces** el ítem «Actualizaciones» aparece en el sidebar.
- **Dado** un rol sin el permiso (por ejemplo `maestro`), **entonces** el ítem no aparece y, si entra por URL, ve el
  aviso de `RequirePermission`.
- **Dado** el listado, **entonces** las cards se agrupan en el orden de etapa
  `pendiente → en desarrollo → etapa de pruebas → finalizado` y, dentro de cada grupo, la más reciente arriba.
- **Dado** el buscador, **cuando** escribo algo, **entonces** filtra por título, descripción y módulo.
- **Dado** el filtro de estado, **cuando** elijo una etapa, **entonces** solo veo ese grupo.
- **Dado** el encabezado, **entonces** veo un contador por estado.
- **Dado** el estado de una card, **entonces** se muestra como texto/etiqueta **neutra, sin color de estado**.
- **Dado** que no hay actualizaciones, **entonces** veo un estado vacío claro (distinto según el rol).
- **Dado** que la API falla, **entonces** veo un mensaje de error con reintento.

---

## 3. Decisiones aprobadas (no reabrir)

1. **Tablero tipo Trello**, no tabla ni bento: una columna horizontal por etapa (pendiente, en desarrollo, etapa de pruebas, finalizado), con las cards apiladas dentro de cada columna y scroll horizontal en pantallas angostas.
2. **Sin colores por estado**: la etiqueta de estado es neutra (texto + borde/fondo suave del token base).
3. **Orden doble:** agrupación por etapa en orden de avance (pendiente primero, finalizado al final) y, dentro del grupo, fecha descendente.
4. **Filtros:** buscador «Buscar…», chips de estado (Todos + los 4) y contador por estado.
5. **Ruta `/actualizaciones`**, etiqueta «Actualizaciones» en el sidebar.
6. **Solo developer** ve las acciones de escritura; admin y admin temporal ven la página en modo informativo.
7. **Formulario** en modal con: título, descripción, estado, fecha, orden, versión (opcional) y módulo (opcional).
8. **Eliminar** con `ConfirmDialog` en modo peligro y soft delete en backend.
9. **Sin degradados** y solo tokens `--sasha-*`.

---

## 4. Contrato con el backend

Base `/api`, según `017-actualizaciones-sistema`.

```ts
// src/services/actualizaciones.ts
export type EstadoActualizacion = 'pendiente' | 'en_desarrollo' | 'etapa_pruebas' | 'finalizado'

export interface ActualizacionSistema {
  id: string
  titulo: string
  descripcion: string
  estado: EstadoActualizacion
  fecha: string          // YYYY-MM-DD
  orden: number
  version: string | null
  modulo: string | null
  created_at: string
  updated_at: string
}

export interface ActualizacionInput {
  titulo: string
  descripcion: string
  estado?: EstadoActualizacion
  fecha?: string
  orden?: number
  version?: string | null
  modulo?: string | null
}
```

| Acción | Endpoint | Permiso |
|---|---|---|
| Listar | `GET /actualizaciones/` | `actualizaciones:get` |
| Crear | `POST /actualizaciones/` | `actualizaciones:post` |
| Editar | `PUT /actualizaciones/{id}` | `actualizaciones:put` |
| Eliminar | `DELETE /actualizaciones/{id}` | `actualizaciones:delete` |

Se usa `apiRequest`/`apiRequestList` de `src/lib/api.ts`. Query key: `['actualizaciones']`.

---

## 5. Archivos a crear o tocar

| Archivo | Acción |
|---|---|
| `src/routes/_app/actualizaciones.tsx` | Página nueva |
| `src/services/actualizaciones.ts` | Servicio + tipos |
| `src/helpers/actualizaciones.ts` | Etiquetas, orden, agrupación, validación, formato de fecha |
| `src/components/actualizaciones/ActualizacionCard.tsx` | Card |
| `src/components/actualizaciones/ActualizacionFormModal.tsx` | Modal de alta/edición |
| Chips de estado + contadores | En la propia página (`actualizaciones.tsx`) |
| `src/helpers/nav.ts` | Ítem «Actualizaciones» |
| `src/components/layout/nav-icons.tsx` | Icono del ítem |
| `src/helpers/permissions.ts` | Permisos en `adminPerms` y `developer` |
| `src/helpers/command-palette.ts` | Descripción y palabras clave de la ruta |
| `src/styles/style1.css` | Estructura de la rejilla y la card |
| `src/styles/style2.css` | Piel de la card (si aplica) |
| `src/tests/e2e/actualizaciones.spec.ts` | E2E |

---

## 6. Diseño de la página

### 6.1 Encabezado

- Título «Actualizaciones».
- Subtítulo corto: «Lo que estamos construyendo».
- Contador por estado: `4 pendientes · 2 en desarrollo · 1 en pruebas · 8 finalizadas`.
- Botón «Agregar actualización» **solo** si `can('actualizaciones:post')`.

### 6.2 Filtros

- `SearchInput` con placeholder exacto «Buscar…» (REG-UI-11).
- Chips: Todos · Pendiente · En desarrollo · Etapa de pruebas · Finalizado.
- El filtro es de una sola selección; «Todos» por defecto.

### 6.3 Tablero, agrupación y orden

- Cuatro columnas horizontales en orden de avance: `pendiente`, `en_desarrollo`, `etapa_pruebas`, `finalizado`.
- Cada columna lleva su encabezado con etiqueta y conteo; las columnas vacías muestran «Sin actualizaciones».
- Dentro de la columna: `fecha DESC`, luego `orden ASC`, luego `created_at DESC` (mismo criterio que el backend).
- Los chips de etapa filtran qué columna se muestra; «Todos» muestra las cuatro.
- Scroll horizontal en pantallas angostas (una columna de ~82vw en móvil).
- Si hay búsqueda, se respeta el mismo orden dentro de cada columna.

### 6.4 Card

- Título (máx. 2 líneas).
- Módulo como chip neutro (si viene).
- Versión como texto secundario (si viene).
- Descripción recortada a 3 líneas con `line-clamp`.
- Fecha formateada `dd MMM yyyy` en español.
- Estado como etiqueta **neutra** (sin color de estado).
- Botones **Editar** y **Eliminar** en el pie de la card, visibles solo con `actualizaciones:put`/`:delete`.
  (Se cambiaron por botones directos porque el menú de 3 puntos resultó inestable bajo carga; ver bitácora.)

### 6.5 Estados de la pantalla

- **Cargando:** skeletons de card.
- **Vacío (admin/ADT):** «Todavía no hay actualizaciones».
- **Vacío (developer):** «Todavía no hay actualizaciones» + botón «Agregar la primera».
- **Error:** mensaje con botón «Reintentar».
- **Sin resultados de búsqueda:** «No hay actualizaciones que coincidan».

### 6.6 Estilos

- Clases nuevas: `.actualizaciones`, `.actualizaciones__toolbar`, `.actualizaciones__contadores`,
  `.actualizaciones__grupo`, `.actualizaciones__grid`, `.actualizacion-card`, `.actualizacion-card__head`,
  `.actualizacion-card__desc`, `.actualizacion-card__meta`, `.actualizacion-card__estado`.
- Rejilla: `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`; 1 columna por debajo de 640px.
- Definir en `style1.css` con tokens; si la piel Matte Dark necesita ajuste, en `style2.css`.
- **Prohibido:** degradados y colores de estado.

---

## 7. Permisos y navegación

### 7.1 `src/helpers/permissions.ts`

- `adminPerms` (usado por `admin` y `admin_temporal`): agregar `'actualizaciones:get'`.
- `developer`: agregar `'actualizaciones:get'`, `'actualizaciones:post'`, `'actualizaciones:put'`,
  `'actualizaciones:delete'`.

### 7.2 `src/helpers/nav.ts`

```ts
{ to: '/actualizaciones', label: 'Actualizaciones', permission: 'actualizaciones:get', icon: 'megaphone' }
```

Posición: antes de «Auditoría» (zona informativa/sistema). Registrar el icono en `nav-icons.tsx`.

### 7.3 Command palette

Agregar la ruta a `DESCRIPCION_RUTA` y `PALABRAS_CLAVE_RUTA` (`actualizaciones`, `novedades`, `roadmap`, `cambios`).

---

## 8. Formulario (solo developer)

Campos:

| Campo | Control | Reglas |
|---|---|---|
| Título | `Field` texto | requerido, 1..160 |
| Descripción | `Field` textarea | requerida, 1..4000 |
| Estado | `Field` select | uno de los 4, default `pendiente` |
| Fecha | `input type="date"` | default hoy |
| Orden | `input type="number"` | `>= 0`, default 0 |
| Versión | `Field` texto | opcional, máx. 40 |
| Módulo | `Field` texto | opcional, máx. 80 |

- Validación en cliente con los mismos límites del backend.
- `useMutation` con invalidación de `['actualizaciones']` y toast de éxito/error.
- Al cerrar con cambios sin guardar, confirmar descarte.

---

## 9. Tests e2e (`src/tests/e2e/actualizaciones.spec.ts`)

Usuarios de `data_test.sql` y `Admin123!`:

| Caso | Usuario | Qué verifica |
|---|---|---|
| Admin ve la página y no puede escribir | `1002026100` | cards visibles, sin «Agregar», sin botones Editar/Eliminar |
| Admin temporal ve la página y no puede escribir | `1002026608` | igual que admin |
| Developer CRUD | usuario developer del fixture | crear, editar y eliminar una actualización de prueba |
| Orden por etapa | developer | la primera card pertenece al grupo «Pendiente» y la fecha más reciente va primero dentro del grupo |
| Filtro y búsqueda | admin | filtrar por estado y buscar por título |
| Rol sin permiso | `maestro` | no ve el ítem en `.sidebar-nav` |

`data-testid` mínimos: `actualizaciones-page`, `actualizaciones-buscar`, `actualizaciones-filtro-{estado}`,
`actualizaciones-contador-{estado}`, `actualizacion-card-{id}`, `actualizacion-agregar`,
`actualizacion-editar-{id}`, `actualizacion-eliminar-{id}`, `actualizacion-form`, `actualizacion-form-guardar`,
`actualizacion-confirmar-eliminar`.

---

## 10. Criterio de hecho

- La página `/actualizaciones` existe, está en el sidebar para los tres roles y bloquea al resto.
- Admin y admin temporal ven cards sin acciones; developer ve CRUD completo.
- Rejilla responsive 3/2/1, sin degradados ni colores de estado.
- Buscador, chips de estado y contadores funcionan.
- E2E de los 6 casos en verde.
- `tsc`, `eslint` y `build` sin errores nuevos.
- MAPA/API_CLIENTES actualizados solo si el usuario lo aprueba.

---

## 11. Riesgos y notas

1. **Datos del e2e:** el spec depende de las 4 filas de `data_test.sql`; si el CRUD del developer crea/borra, debe usar
   títulos propios y limpiar al final para no romper el orden esperado.
2. **`data_test` compartido:** los e2e corren en serie (`workers: 1`); no usar el mismo título que los datos fijos.
3. **Sin color de estado:** si más adelante se piden colores, se hace en una tarea aparte y se actualiza esta spec.
