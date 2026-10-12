# Plan de Especificación: Configuración de pagos por periodo — Frontend

> Feature `008-configuracion-pagos-periodo` · Plataforma escolar Sasha · capa **frontend** (`sasha_fronted/`) · v1
> Fuente de requisitos: decisiones cerradas con el usuario (v1).
> Referencias de código citadas abajo; son puntos de anclaje reales, no código nuevo.

---

## 1. Visión General y Objetivos

- **Problema.** Hoy el día de pago, el día de mora, el monto de la mensualidad y los recargos por retraso no se configuran en ninguna parte: la mensualidad nace al matricular sin que contabilidad pueda fijar **cuándo vence**, **cuánto se paga por grado** ni **qué recargo aplica según los días de retraso**. No existe pantalla para editar esos valores y, si se cambian, no hay forma de decidir si el cambio afecta a lo ya generado.
- **Objetivo v1.** Que **contabilidad** tenga una página propia (`pagos_config:get`) que:
  1. liste los **periodos** (estilo registros: `DataTable` con buscador, filtros, Descargar y conteo);
  2. en cada periodo, un botón **Configurar pagos** abra un `Modal` donde se define:
     - **Día de pago** y **Día de mora** (día del mes, `1`–`31`, select);
     - una **sección por grado** (todos los grados del catálogo, **precargados**) con un **monto a pagar** por grado (default `0`);
     - por cada grado, una lista **añadible** de **reglas de mora**: cada fila es «N días o más → monto fijo», con **+ Agregar** y quitar fila;
  3. al **guardar una edición** de una configuración existente, **pregunte si aplica retroactivo** (sí/no) antes de enviar.
- **Fuera de alcance (v1).** Cambios de backend (se documenta el contrato que el frontend consume, no se implementa aquí); generación de obligaciones/mensualidades (eso vive en `/pagos`); app móvil (`sasha_movil/`); recálculo real de recargos (el backend los calcula; el frontend solo los define); reportes/PDF de configuración.

### 1.1 Contexto técnico verificado (rutas reales)

Frontend React 19 + TanStack Start (`sasha_fronted/`):

- **Página de registros de referencia (a espejar):** `src/routes/_app/catalogos/periodos.tsx` — `DataTable` (`title`, `columns`, `filters`, `exportRows`, `onRowContextMenu`) + `Modal xl` + menú contextual Ver/Editar/Eliminar + guardado con `ConfirmDialog` (`confirmSave`) y `dirty` (`snapshot(form) !== baseline`). Es exactamente el patrón de página de registros que pide la feature.
- **Patrón de filas repetibles a reutilizar:** `src/components/catalogos/ParcialesPeriodoForm.tsx` (sección controlada `value`/`onChange`/`disabled` con `+ Agregar`, quitar fila y reindexado) y `src/components/disciplina/TipoFichaModal.tsx` (filas `.nivel-fila`, botón `+ Agregar` con `Plus`, quitar con `Trash2`, validación `error`, `ConfirmDialog`, `useDismiss`, `key` temporal con contador `nivelSeq`).
- **UI base:** `src/components/ui/Modal.tsx` (`useDismiss`, `wide`, `xl`), `src/components/ui/ConfirmDialog.tsx` (props `open/title/message/confirmLabel/cancelLabel/danger/confirmDisabled/onConfirm/onCancel`), `src/components/ui/Field.tsx`, `src/components/ui/DataTable.tsx` (`addTestId`, `exportRows`, `filters`, `onRowContextMenu`), `src/components/ui/SearchInput.tsx` (placeholder fijo «Buscar…»), `src/components/ui/Combobox.tsx`.
- **Gating de permisos:** `src/components/gates/Can.tsx` (`RequirePermission`, `Can`, `useCan`). La matriz de permisos de la UI está en `src/helpers/permissions.ts` (`ROLE_PERMISSIONS`; `contabilidad` ya tiene `pagos:get/post/put`, `cartera:get`, `analitica_pagos:get`). **Nota:** para que `RequirePermission`/`Can` funcionen con el permiso nuevo hay que añadirlo a esta matriz (no depende de `/me`).
- **Navegación:** `src/helpers/nav.ts` (`NAV_ITEMS` con `permission` y `hideForRoles`); el menú lateral solo muestra ítems cuyo permiso cumple el rol activo (ver `_app.tsx` → `AppShell`). No hay sección de pagos agrupada: los ítems `Pagos` (`pagos:get`) y `Recibos` (`pagos:put`) son de primer nivel.
- **API cliente:** `src/lib/api.ts` (`apiRequest`, `apiRequestList`, `userMessageFromError`, `ApiError`). Servicio de pagos existente: `src/services/pagos.ts` (no define tipos de configuración).
- **Servicios de catálogo a reutilizar:** `src/services/catalogos.ts` (`listPeriodos`, `listGrados`, tipos `Periodo`/`Grado`). El periodo trae `nombre`, `anio_lectivo`, `status`, `fecha_inicio`/`fecha_fin`; el grado trae `id`, `codigo`, `nombre`, `orden`, `status`.
- **Helpers:** `src/helpers/periodos.ts` (`labelPeriodo`, `periodoSelectOptions`, `periodoEstadoPalabra`).
- **Estilos:** tokens en `src/styles/tokens.css`; BEM en `src/styles/style1.css` (`.periodo-reglas`, `.periodo-reglas__grid`, `.periodo-parciales`, `.nivel-fila`, `.nivel-fila__quitar`, `.niveles__pie`, `.ficha-form`, `.expediente__seccion`). **Nunca degradados.**
- **Contrato de backend que consume** (definido en su spec `backend_sasha/spec/002-configuracion-pagos-periodo/plan.md`; hoy aún no escrito en disco, este plan fija el contrato):
  - `GET /pagos/configuracion/{periodo_id}` → `{ periodo_id, dia_pago, dia_mora, grados: [{ grado_id, grado_nombre, monto, reglas_mora: [{ dias, monto }] }] }` (todos los grados; sin config → `monto: 0`, `reglas_mora: []`).
  - `PUT /pagos/configuracion/{periodo_id}` → body `{ dia_pago, dia_mora, retroactivo: bool, grados: [{ grado_id, monto, reglas_mora: [{ dias, monto }] }] }`.
  - Permisos nuevos `pagos_config:get` / `pagos_config:put` (asignados a `contabilidad`).
- **E2E:** `src/tests/e2e/` (Playwright) con `fixtures/auth.ts` (`loginAs`); el usuario de contabilidad/caja de los fixtures es `1002026603` (contraseña `Admin123!`, ver `pagos.spec.ts`, `analitica-pagos.spec.ts`). Referencia de página de registros: `catalogos.spec.ts`, `periodos.spec.ts`.

---

## 2. Historia de Usuario y Criterios de Aceptación

- **Historia.** Como **contabilidad** (rol con `pagos_config:get`/`pagos_config:put`), quiero **configurar por periodo el día de pago, el día de mora, el monto por grado y las reglas de recargo por retraso en una sola pantalla**, para **fijar las condiciones de cobro sin depender del permiso de catálogos y decidiendo si un cambio aplica a lo ya generado**.

Criterios de aceptación:

1. **Página nueva y permiso.** Dado un usuario sin `pagos_config:get`, cuando navega a la ruta de configuración de pagos, entonces ve «No tienes permiso `pagos_config:get`» (`RequirePermission`); dado contabilidad, entonces ve la página con el listado de periodos.
2. **Listado de periodos (estilo registros).** Dado contabilidad en la página, entonces ve un `DataTable` «Configuración de pagos» con buscador «Buscar…», filtros (Año lectivo, Estado), Descargar (Excel/PDF) y el **conteo** junto al título.
3. **Abrir configuración.** Dado un periodo, cuando pulsa el botón **Configurar pagos** de la fila (o la opción del menú contextual), entonces se abre un `Modal` que carga `GET /pagos/configuracion/{periodo_id}`.
4. **Días del mes.** Dado el modal, entonces hay un select **Día de pago** y un select **Día de mora**, cada uno con los días **1–31**, con el valor devuelto por el backend seleccionado.
5. **Montos por grado (precargados).** Dado el modal, entonces aparece una sección por **cada grado** del catálogo (incluidos los que no tenían config, con **monto 0**), cada una con un input **Monto a pagar** (numérico, `min=0`, default `0`).
6. **Reglas de mora añadibles.** Dado un grado, cuando pulsa **+ Agregar** (en la sub-sección de mora de ese grado), entonces aparece una fila «N días o más» con input de **días** (`min=1`) e input de **monto** (`min=0`); cada fila se puede **quitar**.
7. **Reglas acumulativas.** Dado un grado con reglas de mora, el recargo total por un retraso de `R` días es la **suma de los montos de las reglas con `dias_min ≤ R`** (una sola regla `1 día → 100` implica que 5 días de retraso siguen cobrando **100**, no 500). Este comportamiento se documenta en la UI (nota breve) y lo calcula el backend.
8. **Validaciones.** Dado el modal, cuando hay un **monto < 0**, un **día < 1** o **dos reglas de mora con el mismo `dias` en el mismo grado**, entonces se marca el error y **Guardar** queda deshabilitado.
9. **Dirty y guardado.** Dado el modal sin cambios, entonces **Guardar** está deshabilitado; dado un cambio, se habilita y al pulsarlo aparece un `ConfirmDialog` de confirmación.
10. **Retroactivo en edición.** Dado que **ya existía** configuración para el periodo, cuando confirma el guardado, entonces aparece un `ConfirmDialog` extra **«¿Aplicar retroactivamente?»** (Sí/No) que define `retroactivo` en el `PUT`; en una configuración **nueva** (sin config previa) el `PUT` va con `retroactivo: false` sin preguntar.
11. **Persistencia.** Dado el guardado confirmado, entonces se envía `PUT /pagos/configuracion/{periodo_id}`, se muestra un toast de éxito, se invalida la query y, al reabrir el modal, los valores persistidos se ven.
12. **Sin dependencia de `catalogos`.** Dado contabilidad (que **no** tiene `catalogos:get`), entonces puede usar la página y el modal sin que se le exija ningún permiso de catálogos.

---

## 3. Arquitectura Frontend

### 3.1 Archivos a crear

| Archivo | Propósito |
|---|---|
| `sasha_fronted/src/routes/_app/configuracion-pagos.tsx` | **Página nueva** (capa contabilidad). `RequirePermission permission="pagos_config:get"`. `DataTable` de periodos (estilo registros) con botón/acción **Configurar pagos** por fila y en el menú contextual. Mantiene el estado del modal (`open`, `periodo`, `config`, `form`, `dirty`, `confirmSave`, `confirmRetroactivo`). |
| `sasha_fronted/src/components/pagos/ConfiguracionPagosModal.tsx` | **Modal de configuración** (`Modal xl`). Selects de día de pago/mora (1–31); lista de grados con input de monto; por grado, sub-sección de reglas de mora añadibles; validación, `dirty`, `ConfirmDialog` de guardado y `ConfirmDialog` de retroactivo. Nombre de archivo/carpeta a confirmar (ver decisiones abiertas: `components/pagos/` vs `components/catalogos/`). |
| `sasha_fronted/src/components/pagos/ReglasMoraGrado.tsx` | Sub-componente controlado de **reglas de mora de un grado**: recibe `value: ReglaMoraForm[]` y `onChange`; filas «N días o más → monto» con **+ Agregar** y quitar; reutiliza el patrón de `ParcialesPeriodoForm` (clases `.nivel-fila`, `.nivel-fila__quitar`, `.niveles__pie`). |
| `sasha_fronted/src/helpers/configuracion-pagos.ts` | Helpers puros: `diasOptions()` (1–31), `montoSeguro(v)`, `validarConfiguracion(form)` (monto ≥ 0, día 1–31, `dias` ≥ 1 y sin duplicados por grado) y normalización `configToForm`/`formToPayload`. |
| `sasha_fronted/src/tests/e2e/configuracion-pagos.spec.ts` | E2E Playwright del flujo completo (ver §9). |

### 3.2 Archivos a modificar

| Archivo | Cambio |
|---|---|
| `sasha_fronted/src/helpers/permissions.ts` | Añadir `pagos_config:get` y `pagos_config:put` a la lista de `contabilidad` (y, según decisión abierta, a `admin`/`admin_temporal`). Sin esto la UI no puede hacer gating con el permiso nuevo. |
| `sasha_fronted/src/helpers/nav.ts` | Añadir un ítem `{ to: '/configuracion-pagos', label: 'Configuración de pagos', permission: 'pagos_config:get', icon: 'wallet' }` (icono/label a confirmar) para que contabilidad lo vea en el menú; se puede ubicar junto a `Pagos`/`Recibos`. |
| `sasha_fronted/src/services/pagos-config.ts` | **Servicio nuevo** (o ampliar `src/services/pagos.ts`, ver decisiones abiertas): tipos y funciones `getConfiguracionPagos` / `updateConfiguracionPagos` (§4). |
| `sasha_fronted/src/styles/style1.css` | Añadir BEM de la sección de configuración reutilizando `.nivel-fila`, `.nivel-fila__quitar`, `.niveles__pie`, `.periodo-reglas`; añadir contenedores `.pagos-config`, `.pagos-config__grado`, `.pagos-config__dias`, `.mora-regla` solo si el layout lo requiere. **Nada de degradados.** |
| `sasha_fronted/src/routeTree.gen.ts` | Se **regenera automáticamente** al crear la ruta (plugin de TanStack Router). No se edita a mano; se commitea el resultado generado. |
| `sasha_fronted/src/routes/_app/catalogos/periodos.tsx` | **Opcional (decisión abierta):** añadir la opción **Configurar pagos** en el menú contextual de cada periodo (visible solo con `Can permission="pagos_config:get"`), para que admin/contabilidad lleguen también desde Periodos. Si no se aprueba, no se toca. |

### 3.3 Archivos a eliminar

| Archivo | Motivo |
|---|---|
| — | Ninguno. La feature es aditiva (página, modal y servicio nuevos). |

### 3.4 Descomposición de la página y el modal

- `configuracion-pagos.tsx` conserva el patrón de `catalogos/periodos.tsx`: `useQuery(['periodos'], listPeriodos)` para la tabla, `useState` del modal (`open`, `periodoActivo`), `useAccionPalette` opcional, y monta `<ConfiguracionPagosModal periodo={periodoActivo} onClose={...} />`.
- La carga de la configuración (`GET /pagos/configuracion/{id}`) se hace **al abrir el modal** (no en la lista), con `useQuery` `enabled: open && Boolean(periodo?.id)` y `queryKey: ['pagos-config', periodoId]`. La lista de grados se obtiene con `listGrados()` (o se usa `grados` del propio `GET`); se **fusionan** para que todos los grados aparezcan precargados con `monto 0` cuando no tienen config.
- `ConfiguracionPagosModal` mantiene el estado `form` (`{ dia_pago, dia_mora, grados: { grado_id, monto, reglas_mora }[] }`), `baseline` (snapshot JSON) para `dirty`, el estado de los dos `ConfirmDialog` (guardar y retroactivo) y la mutación `PUT`.
- `ReglasMoraGrado` es controlado por el padre: `onChange` recibe las filas del grado correspondiente; el padre las guarda en `form.grados[i].reglas_mora`.
- `useDismiss(onClose)` para el cierre animado del modal (igual que `TipoFichaModal`). Al cerrar con `dirty`, pedir confirmación de descarte (patrón de `configuracion.tsx`).

---

## 4. Servicios y tipos (`src/services/pagos-config.ts`)

```ts
import { apiRequest } from '#/lib/api'

/** Regla de mora de un grado: "N días o más" → monto fijo. */
export interface ReglaMora {
  dias: number
  monto: number
}

/** Configuración de pago de un grado (una entrada por grado del catálogo). */
export interface ConfigGrado {
  grado_id: string
  grado_nombre: string
  monto: number          // default 0
  reglas_mora: ReglaMora[]
}

/** Respuesta de GET /pagos/configuracion/{periodo_id}. */
export interface ConfiguracionPagos {
  periodo_id: string
  dia_pago: number       // 1–31
  dia_mora: number       // 1–31
  grados: ConfigGrado[]  // todos los grados; sin config → monto 0, reglas_mora []
}

/** Cuerpo de PUT /pagos/configuracion/{periodo_id}. */
export interface ConfiguracionPagosUpdate {
  dia_pago: number
  dia_mora: number
  retroactivo: boolean
  grados: { grado_id: string; monto: number; reglas_mora: ReglaMora[] }[]
}

export async function getConfiguracionPagos(periodoId: string) {
  return apiRequest<ConfiguracionPagos>(
    `/pagos/configuracion/${encodeURIComponent(periodoId)}`,
  )
}

export async function updateConfiguracionPagos(periodoId: string, body: ConfiguracionPagosUpdate) {
  return apiRequest<ConfiguracionPagos>(
    `/pagos/configuracion/${encodeURIComponent(periodoId)}`,
    { method: 'PUT', body },
  )
}
```

Tipos solo-frontend del formulario (en el modal o en `src/helpers/configuracion-pagos.ts`):

```ts
/** Fila de regla de mora en el formulario (días/monto como texto mientras se escribe). */
export interface ReglaMoraForm { key: string; dias: string; monto: string }

/** Estado del formulario por grado. */
export interface GradoConfigForm { grado_id: string; grado_nombre: string; monto: string; reglas_mora: ReglaMoraForm[] }
```

- Se reutilizan tipos existentes de `src/services/catalogos.ts` (`Periodo`, `Grado`) y `src/helpers/periodos.ts` (`labelPeriodo`) para el listado.
- No se toca `src/services/pagos.ts` salvo que se decida agregar aquí las funciones (decisión abierta): se prefieren **archivo nuevo** `pagos-config.ts` para no mezclar la configuración con el flujo de cobro.
- **Contrato que no cambia:** `src/services/pagos.ts` (`Mensualidad`, `cobrarMeses`, `listMensualidades`, etc.) queda intacto.

---

## 5. Diseño UI

- **Regla base (REG-UI-04):** el formulario vive en un `Modal` con `useDismiss` y **confirmación** antes de guardar (`ConfirmDialog`). El guardado es una sola operación (`PUT`).
- **Estilo registros (REG-UI-12):** la página usa `DataTable` con `title` (conteo), buscador «Buscar…» fijo (`REG-UI-11`), filtros (Año lectivo, Estado), Descargar (Excel/PDF) y la acción por fila. No se introduce un estilo nuevo para el listado.
- **Botón por fila y menú contextual.** La acción **Configurar pagos** se expone como botón en una columna de acciones de la fila y como opción del menú contextual (`onRowContextMenu`), envuelto en `<Can permission="pagos_config:get">` (o `pagos_config:put` si se decide que solo edita quien puede guardar; ver decisiones abiertas).
- **Modal (secciones):**
  1. **Vencimientos:** `Field` «Día de pago» y `Field` «Día de mora», cada uno con `<select>` de los días **1–31** (helper `diasOptions()`). Se usa select nativo (como los filtros de `DataTable`) o `Combobox`; sin degradados.
  2. **Montos por grado:** una `section`/card por grado (todas, precargadas) con el nombre del grado y `Field` «Monto a pagar» (`type=number`, `min=0`, default `0`).
  3. **Reglas de mora por grado:** sub-sección dentro de cada card, montada con `ReglasMoraGrado`. Filas tipo `.nivel-fila` con input **días** («N días o más») e input **monto**, botón **+ Agregar** (`Plus`) y quitar (`Trash2`).
- **Clases BEM:** reutilizar `.ficha-form`, `.expediente__seccion`, `.expediente__titulo`, `.niveles`, `.nivel-fila`, `.nivel-fila__quitar`, `.niveles__pie`, `.periodo-reglas`, `.periodo-reglas__titulo`. Añadir únicamente contenedores nuevos si el layout lo pide: `.pagos-config`, `.pagos-config__grado`, `.pagos-config__dias`, `.mora-regla`, `.mora-regla__pie`. **Sin degradados** (`REG-UI-01`); usar tokens (`--sasha-*`).
- **Nota de recargo (texto plano):** junto a las reglas de mora, un `texto-muted` que explique que el recargo total es **la suma de las reglas cuyo «N días» ya se alcanzó** (reglas acumulativas), para evitar el malentendido de recargo escalonado.
- **Footer:** `Cancelar` (`btn--ghost`) + `Guardar` (`btn--primary`, `disabled` si hay error o `!dirty` o `isPending`), igual que `periodos.tsx`. Modo ver (si aplica) muestra solo `Cerrar`.
- **`data-testid` nuevos (para e2e):**
  - Página: `config-pagos-row-{periodoId}` (fila/acción), `config-pagos-btn-{periodoId}` (botón «Configurar pagos»), `config-pagos-ctx-{periodoId}` (opción del menú contextual).
  - Modal: `pagos-config-modal`, `pagos-config-dia-pago`, `pagos-config-dia-mora`, `pagos-config-grado-{gradoId}` (card), `pagos-config-monto-{gradoId}` (input de monto), `pagos-config-agregar-regla-{gradoId}` (botón + Agregar), `pagos-config-regla-{gradoId}-{i}` (fila), `pagos-config-regla-{gradoId}-{i}-dias`, `pagos-config-regla-{gradoId}-{i}-monto`, `pagos-config-regla-{gradoId}-{i}-quitar`, `pagos-config-error`, `pagos-config-save-button`, `pagos-config-confirm` (ConfirmDialog guardar), `pagos-config-retroactivo` (ConfirmDialog retroactivo con Sí/No).
  - Se conservan los `data-testid` globales del `DataTable` (`data-table-search`, `data-table-download`, `table-row-count`, `data-table-filters`).

---

## 6. Navegación y Permisos

- **Ruta nueva:** `/configuracion-pagos` → archivo `sasha_fronted/src/routes/_app/configuracion-pagos.tsx` (bajo el layout `_app`), envuelta en `<RequirePermission permission="pagos_config:get">`. **Nombre exacto de ruta por confirmar** (ver §7 y decisiones abiertas).
- **Entrada en el nav:** añadir el ítem a `NAV_ITEMS` en `src/helpers/nav.ts` con `permission: 'pagos_config:get'`. Solo lo ven los roles que tengan el permiso (contabilidad; y admin/admin_temporal si se decide dárselo). Se evita `hideForRoles` (el gating ya es por permiso).
- **Permisos nuevos:** `pagos_config:get` (ver y abrir el modal) y `pagos_config:put` (guardar). Hay que declararlos en `src/helpers/permissions.ts` (`ROLE_PERMISSIONS`) para que `Can`/`RequirePermission`/`useCan` los reconozcan. El ítem del nav y la página usan `get`; el botón Guardar y el `PUT` usan `put`.
- **Guardas en el modal:** el botón de la fila y la opción contextual con `Can permission="pagos_config:get"`; el botón `Guardar` con `Can permission="pagos_config:put"`.
- **Sin dependencia de `catalogos`:** la página no usa `catalogos:get`; los datos de periodos y grados se leen de endpoints que contabilidad ya puede consumir por su rol (el `GET` de configuración devuelve los grados; para el listado de periodos se reutiliza `listPeriodos` — a validar que contabilidad tenga acceso a `GET /catalogos/periodos` o que el backend exponga los periodos activos; ver §8/§7 y decisiones abiertas).

---

## 7. Decisiones Técnicas

### 7.1 Ruta nueva, permiso propio y desacople de `catalogos`

La página es de **contabilidad** y se separa de los catálogos porque su permiso (`pagos_config:*`) es distinto de `catalogos:*`. Se propone la ruta plana `/configuracion-pagos` (hermana de `/pagos` y `/recibos`) para mantener el patrón de rutas de primer nivel del área de pagos. Alternativas evaluadas: `/pagos/configuracion` (anidada) o `/configuracion/pagos`. **El nombre definitivo se decide con el usuario.**

### 7.2 Fechas = días del mes, no fechas completas

El backend (y este formulario) guardan **día del mes** (`dia_pago`, `dia_mora`, `1`–`31`), no fechas calendario: el vencimiento real de cada mes se deriva del día configurado. La UI solo ofrece un select de 1–31; no se capturan meses ni años.

### 7.3 Monto por grado, precargado

El `GET` devuelve **todos los grados**, incluso sin config (con `monto 0` y `reglas_mora []`). El modal muestra una card por grado; si el backend no devolviera algún grado, el frontend lo añade desde `listGrados()` al fusionar. El monto es por grado (no por modalidad ni por alumno).

### 7.4 Reglas de mora acumulativas (no escalonadas)

Cada regla es `(dias_min, monto)` con semántica **«N días o más»**. El recargo total de un retraso de `R` días es:

```
recargo(R) = Σ monto(regla) para toda regla con regla.dias_min ≤ R
```

Ejemplo: una sola regla `(1, 100)` ⇒ 5 días de retraso ⇒ **100** (no 500). Varias reglas se **suman**. Esta semántica la calcula el backend; el frontend solo la captura y la explica en una nota. Por eso se valida que no haya **dos reglas con el mismo `dias`** en el mismo grado (duplicarlas sería ambiguo).

### 7.5 Flujo de guardado con retroactivo (dos confirmaciones encadenadas)

1. El usuario pulsa **Guardar** → se abre `ConfirmDialog` de confirmación («¿Guardar la configuración de pagos?»).
2. Si el periodo **ya tenía configuración** (se cargó una config existente, detectado porque el `GET` devolvió datos o porque existe una config previa registrada), al confirmar el paso 1 se abre un **segundo `ConfirmDialog`** «¿Aplicar retroactivamente?» con **Sí** (retroactivo `true`) y **No** (retroactivo `false`).
3. En configuración **nueva** (o si el usuario decide que no aplica), el `PUT` va con `retroactivo: false` sin la segunda pregunta.
4. Al elegir Sí/No se ejecuta la mutación `updateConfiguracionPagos(periodoId, { ...form, retroactivo })`.

Nota: `ConfirmDialog` solo tiene Aceptar/Cancelar; «Sí/No» se implementa con `confirmLabel="Sí, retroactivo"` / `cancelLabel="No"` sobre el mismo componente (o un `Modal` propio si se aprueba). No se crea un componente de diálogo nuevo si `ConfirmDialog` alcanza.

### 7.6 `dirty` y validación

- `dirty = snapshot(form) !== baseline` (JSON), como en `periodos.tsx`. Sin cambios, **Guardar** deshabilitado.
- Validaciones antes de habilitar Guardar (helper `validarConfiguracion`):
  - `dia_pago` y `dia_mora` ∈ [1, 31] (el select ya lo garantiza; se valida por si acaso).
  - Todo `monto` de grado ≥ 0 (vacío = 0). Todo `monto` de regla ≥ 0.
  - Toda regla con `dias` ≥ 1 (entero).
  - Sin **duplicado de `dias`** dentro del mismo grado.
- Serialización: se envían `monto`/`dias` numéricos; los textos vacíos se normalizan a `0`/`undefined`-no-permitido antes del `PUT`.

### 7.7 Estado de carga y errores del `GET`

Mientras carga la configuración, el modal muestra «Cargando configuración…»; si el `GET` falla, `toast.error(userMessageFromError(e))` y el modal queda con estado vacío reintentable (no se cierra).

---

## 8. Casos Borde y Manejo de Errores

- **Periodo sin configuración:** `GET` devuelve todos los grados con `monto 0` y `reglas_mora []`; el modal se muestra con esos defaults. El `PUT` va con `retroactivo: false` sin preguntar (es creación).
- **Periodo sin grados en el catálogo:** el modal muestra un estado vacío («No hay grados en el catálogo») y **Guardar** envía `grados: []` (a confirmar con backend) o queda deshabilitado.
- **Grado con monto 0:** válido; significa «sin mensualidad» para ese grado (no se bloquea).
- **Reglas de mora vacías:** válido; significa «sin recargo por mora» para ese grado.
- **Regla con `dias` duplicado en el mismo grado:** error visible y Guardar deshabilitado.
- **`dias` = 0 o negativo / no entero:** error; se exige ≥ 1.
- **Monto negativo:** error (`min=0` en el input, más validación).
- **Día fuera de rango:** no ocurre por el select (1–31); se valida igualmente por si el backend devuelve un valor inesperado (se recorta al rango).
- **Doble submit:** Guardar deshabilitado mientras `saveMut.isPending`; los `ConfirmDialog` con `confirmDisabled`.
- **Fallo de red / API en el `PUT`:** `toast.error(userMessageFromError(e))`, los `ConfirmDialog` se cierran, el `dirty` se conserva para reintentar.
- **Cancelar/descartar:** botón Cancelar y cierre con Escape/cruz con `dirty` piden confirmación de descarte (`ConfirmDialog`).
- **Configuración vieja/parcial:** si el backend devuelve grados de más o de menos, el frontend **fusiona** con `listGrados()` para que la sección de grados sea consistente (todos los grados presentes) antes de mostrar y guardar.
- **Modal abierto tras fallar el `GET`:** no se permite guardar hasta que la config cargue correctamente (o se cargue como nueva si el backend responde vacío).
- **Acceso directo por URL sin permiso:** `RequirePermission` muestra «No tienes permiso `pagos_config:get`» (no redirige).
- **Descargar Excel/PDF:** el export usa `exportRows` y `exportFilename="configuracion-pagos"` como en las demás tablas; sin columnas de datos sensibles.

---

## 9. Tests e2e (Playwright)

Nuevo spec `src/tests/e2e/configuracion-pagos.spec.ts` (usa `loginAs` de `src/tests/e2e/fixtures/auth.ts`) con el usuario de contabilidad `1002026603` (`Admin123!`) y los `data-testid` de §5:

1. **Acceso y listado.** `loginAs(page, { code: '1002026603' })` → ir a `/configuracion-pagos` → ver el título con conteo (`table-row-count`), el buscador «Buscar…» y las filas de periodos.
2. **Sin permiso.** Entrar con un rol sin `pagos_config:get` (p. ej. el admin genérico si se decide que no lo tiene, o un usuario de otro rol) → la ruta muestra «No tienes permiso `pagos_config:get`».
3. **Abrir el modal.** Clic en `config-pagos-btn-{periodoId}` → se abre `pagos-config-modal` con `pagos-config-dia-pago` y `pagos-config-dia-mora`.
4. **Configurar días y montos.** Seleccionar día de pago (p. ej. 10) y de mora (p. ej. 15); en `pagos-config-grado-{gradoId}` escribir un monto > 0.
5. **Reglas de mora.** En un grado, clic en `pagos-config-agregar-regla-{gradoId}` dos veces → dos filas; rellenar `config-regla-...-dias`/`...-monto` (p. ej. `1→100`, `5→200`); quitar una con `...-quitar` y verificar que desaparece.
6. **Validación.** Poner dos reglas con el mismo `dias` → `pagos-config-error` visible y `pagos-config-save-button` deshabilitado; corregir y verificar que se habilita.
7. **Guardar nueva (sin retroactivo).** Guardar → `pagos-config-confirm` → confirmar → **no** aparece `pagos-config-retroactivo` → toast de éxito; reabrir el modal y ver los valores persistidos.
8. **Editar con retroactivo.** Reabrir el periodo ya configurado, cambiar el monto de un grado, Guardar → `pagos-config-confirm` → aparece `pagos-config-retroactivo` → elegir **Sí** → toast de éxito y persistencia (verificar que el `PUT` incluyó `retroactivo: true`).
9. **Elegir No retroactivo.** Repetir la edición y elegir **No** en `pagos-config-retroactivo` → el `PUT` va con `retroactivo: false` y los cambios igual persisten.
10. **Dirty.** Abrir un periodo y pulsar Guardar sin cambios → deshabilitado; cerrar con cambios → confirmación de descarte.

Notas de ejecución: `test.describe('configuracion-pagos @critical')`, datos únicos cuando aplique (`Date.now()`), esperar la tabla con `timeout: 15_000`, y respetar el patrón de `pagos.spec.ts` (`loginAs` con `code: '1002026603'`). Si se modifica `data_test.sql` (periodos/grados/usuarios), actualizar `Zettels/TEC-DB-04 Mapa del fixture data_test.md`.

---

## 10. Impacto Documental

- **`sasha_fronted/documentacion/MAPA.md`:** añadir la fila de la ruta nueva `/configuracion-pagos` (contabilidad, `pagos_config:get`): `DataTable` de periodos y modal de días/montos por grado/reglas de mora, con el flujo de retroactivo; y mencionarla si se agrega el acceso desde `/catalogos/periodos`.
- **`sasha_fronted/documentacion/API_CLIENTES.md`:** añadir el bloque `Configuración de pagos` con `GET /pagos/configuracion/{periodo_id}` y `PUT /pagos/configuracion/{periodo_id}` (contrato de §4).
- **`sasha_fronted/documentacion/prd.md`:** registrar que el día de pago, el día de mora y el monto por grado (con recargos por retraso) son configurables por periodo.
- **`sasha_fronted/documentacion/EVOLUCION.md`:** añadir la entrada de la pantalla de configuración de pagos por periodo (nueva ruta, permiso `pagos_config:*`).
- **`src/helpers/nav.ts` / `src/helpers/permissions.ts` / `src/routeTree.gen.ts`:** su cambio se refleja en el MAPA (navegación y permisos); no se editan en silencio.
- **Regla MAPA:** no se edita ningún MAPA en silencio; al terminar el cambio se **pregunta** si el MAPA (frontend y/o backend) va en el commit (ver `AGENTS.md`).
- **Vault (`notas/sasha project/`)** — a proponer (verificar IDs en `Nomenclatura.md` y enlazar a un `IDX-`): decisión `DEC-` (reglas de mora acumulativas; configuración de pagos por periodo con permiso propio `pagos_config:*`; retroactivo explícito al guardar) y regla `REG-UI` si se formaliza el patrón de «sección por entidad con lista de reglas añadibles en modal».

---

## 11. Estrategia de Costo Cero / Entorno Local

- Todo corre en el entorno local/gratuito: React 19 + TanStack Start, Vite/pnpm y Playwright (ya en `package.json`); el backend Go + PostgreSQL + MinIO del `docker compose` local.
- No se agregan dependencias nuevas: selects de días, validación, serialización y fusión de grados son funciones propias (`src/helpers/configuracion-pagos.ts`); no se usa ninguna librería de pago ni servicio externo.
- Reutiliza componentes y estilos existentes (`Modal`, `ConfirmDialog`, `Field`, `DataTable`, `SearchInput`, `.nivel-fila`, `.periodo-reglas`); no hay costos de licencia ni de cómputo en la nube.
- Sin llamadas a APIs externas: solo los endpoints locales del backend.

---

## Decisiones abiertas (a confirmar con el usuario)

1. **Nombre exacto de la ruta:** propuesta `/configuracion-pagos` (alternativas: `/pagos/configuracion`, `/configuracion/pagos`).
2. **Roles con el permiso:** propuesta `contabilidad` + `admin`/`admin_temporal`; ¿solo contabilidad?
3. **Botón en `/catalogos/periodos` para admin:** ¿se añade la opción **Configurar pagos** al menú contextual del periodo (visible con `pagos_config:get`), además de la página propia?
4. **Ubicación del componente/carpeta:** `src/components/pagos/` (propuesto) vs `src/components/catalogos/`.
5. **Servicio:** archivo nuevo `src/services/pagos-config.ts` (propuesto) vs ampliar `src/services/pagos.ts`.
6. **Textos/labels exactos:** «Configuración de pagos», «Día de pago», «Día de mora», «Monto a pagar», «N días o más», «+ Agregar», títulos y mensajes de los `ConfirmDialog` (incluido el texto y los botones del retroactivo).
7. **Detección de «ya existía config»:** ¿el frontend infiere que existe config por los datos del `GET`, o el backend expone un flag/`updated_at` para decidir si preguntar retroactivo?
8. **Acceso de contabilidad a `GET /catalogos/periodos`:** ¿contabilidad puede listar todos los periodos, o el backend debe exponer un endpoint de periodos para `pagos_config:get`?
9. **Formato de la lista de reglas:** orden (¿por `dias` ascendente?) y si el `PUT` debe enviarlas ordenadas; comportamiento si el backend las devuelve desordenadas.
10. **Icono del nav** para «Configuración de pagos» (`wallet` u otro) y su posición respecto a «Pagos»/«Recibos».
