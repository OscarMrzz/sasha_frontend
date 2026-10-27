# Plan de Especificación: Asistencia configurable por sección — Frontend

> Feature `023-asistencia-por-seccion` · Frontend Sasha (React 19 + TanStack Start) · v1
> Capa: **frontend** (`sasha_fronted/`).
> Espejo previsto de `backend_sasha/spec/015-asistencia-por-seccion/plan.md` (esa spec aún **no existe**; este plan fija el contrato que el backend debe cumplir).
> Estado: **propuesta para implementación**. No se implementó código al escribir este documento.
> Reglas del repo: sin degradados; solo tokens `--sasha-*`; buscador «Buscar…» (`REG-UI-11`); registros con `DataTable` (`REG-UI-12`); modales `Modal`/`Field`/`Combobox`/`ConfirmDialog`; permisos con `Can`/`useCan`; `data-testid` en acciones.
>
> **Objetivo:** que una sección pueda configurarse para pasar lista **por clase** (comportamiento actual, por defecto) o **por sección** (un solo maestro responsable pasa una lista diaria para toda la sección y el backend la replica a las clases con horario ese día), sin crear una tabla nueva de asistencia de sección ni un permiso nuevo.

---

## 0. Metadatos

| Campo | Valor |
|---|---|
| Feature | `023-asistencia-por-seccion` |
| Capa | Frontend |
| Spec backend relacionada | `015-asistencia-por-seccion` (pendiente de crear) |
| Estado | Propuesta / lista para `sdd-checklist` |
| Depende de | `Seccion.modo_asistencia`, fan-out de asistencia y endpoints de sección del backend 015 |
| No incluye | Implementación backend, migración, app Flutter, tabla `asistencia_seccion` |
| Fecha | 2026-10-26 |

---

## 1. Contexto y problema

Hoy la asistencia es **siempre por clase**: `GET /asistencia/materias` devuelve una fila por asignación con bloque en el horario activo y el maestro pasa lista dentro de cada clase (`AsistenciaGridModal` + `POST /asistencia/`). En jornadas donde el mismo grupo pasa todas las horas con el mismo grupo de alumnos, esto obliga a repetir la lista clase por clase y a que cada maestro escriba las mismas marcas.

La feature agrega un **modo por sección**: la sección se configura con un maestro responsable vigente para el periodo activo; ese maestro pasa **una marca por alumno y día** (A/T/E/F) que el backend replica a todas las clases de la sección con horario ese día. El registro histórico conserva al maestro que realmente pasó lista, aunque después cambie el responsable.

**Alcance de esta capa:** formulario y tabla de secciones, hub y dashboard del maestro, grilla de asistencia (refactor + variante de sección), pantalla administrativa `/asistencia`, modal de inasistencias, servicios/tipos, invalidaciones de TanStack Query y e2e. Todo lo demás (fan-out, deduplicación de avisos, historial por periodo, validación de responsable) vive en backend 015.

---

## 2. Decisiones aprobadas (no reabrir)

1. **Configuración en el formulario de sección.** El modo y el maestro responsable se editan en Crear/Editar sección. Solo `admin` y `admin_temporal` cambian el modo; el maestro designado (modo sección) o el maestro de cada clase (modo clase) pasa lista.
2. **Por sección + periodo, con historial.** La configuración aplica al **periodo activo**. Un cambio de responsable aplica **desde ahora**: los registros anteriores conservan al maestro que los pasó. El formulario muestra el periodo activo y advierte que no se reescribe el pasado.
3. **Una marca por alumno y día; fan-out en backend.** No hay tabla de asistencia de sección en frontend ni endpoint de "celda de sección". La lista se guarda **completa** (todos presentes por defecto) y el backend replica a las clases con horario ese día.
4. **T y F avisan una sola vez por alumno/día.** `T` = llegó tarde a la jornada; `F` = falta. Los puntos de asistencia siguen calculándose **por asignatura** (no cambia `asistencia_puntos_parcial`). La UI advierte que una falta/tardanza afecta a las clases del día.
5. **Permisos existentes.** Configurar: `catalogos:post`/`catalogos:put` + rol admin. Pasar/corregir: `asistencia:post` + validación de responsable en backend. Leer: `asistencia:get`. No se agrega permiso nuevo al frontend. Los maestros de clase de una sección SECCION quedan en **solo lectura**; coordinador/director/secretaría/consejería también.
6. **El responsable no necesita asignaciones** en la sección; basta con ser maestro activo.
7. **Sin clases programadas ese día → el backend rechaza.** La UI muestra el error y **no permite fechas futuras**.
8. **Botón general** en `/maestro` y en el dashboard de cada clase de la sección. Si el responsable tiene varias secciones, selector. Las marcas guardadas se ven igual desde cualquier clase de la misma sección.
9. **Cambio de responsable.** La UI muestra al responsable **vigente para hoy** y, en registros históricos, al maestro que registró cada día/marca. Nunca debe pintar al responsable actual sobre registros antiguos.

---

## 3. Modelo de datos y contrato con el backend

### 3.1 Lo que existe hoy (verificado en código y `API_CLIENTES.md`)

- `GET /catalogos/secciones` → `Seccion[]`; `POST`/`PUT /catalogos/secciones[/{id}]` con `SeccionCreate`.
- `GET /catalogos/periodos` → `Periodo[]` (incluye `status`; el activo es `status === 'ACTIVE'`).
- `GET /personas/maestros` → `Maestro[]` (`id`, `user_code`, `nombre`, `status`).
- `GET /asistencia/materias` → `AsistenciaMateria[]` (una fila por asignación con bloque en el horario activo).
- `GET /asistencia/semana?asignacion_docente_id=&fecha=` → `SemanaResponse`.
- `POST /asistencia/` (`guardarLista`) → `{ guardadas }`.
- `PUT /asistencia/celda`, `GET /asistencia/inasistencias`, `GET /asistencia/inasistencias/detalle`, `GET /asistencia/pdf`, `GET /asistencia/puntos`, `PUT /asistencia/puntos`.
- `GET /maestro/dashboard?asignacion_docente_id=&fecha=&hora=` → `MaestroDashboard`.

### 3.2 Contrato propuesto para backend 015 (marcado como **nuevo**)

> Nada de esto existe todavía. El frontend lo consume detrás de tipos opcionales y degrada sin romper si el backend aún no lo devuelve.

**a) Extensión de sección (lectura y escritura)**

```ts
export type ModoAsistencia = 'CLASE' | 'SECCION'

export interface Seccion {
  // ...campos actuales
  modo_asistencia?: ModoAsistencia
  maestro_responsable_id?: string | null
  maestro_responsable_nombre?: string | null
  maestro_responsable_code?: string | null
  /** Periodo al que corresponde la configuración vigente devuelta. */
  periodo_academico_id?: string | null
  periodo_nombre?: string | null
}

export interface SeccionCreate {
  // ...campos actuales
  /** Default 'CLASE' si se omite. */
  modo_asistencia?: ModoAsistencia
  /** Obligatorio cuando modo_asistencia === 'SECCION'. */
  maestro_responsable_id?: string | null
}
```

- El backend toma el **periodo activo** al guardar la configuración (decisión 2). El frontend no manda texto libre ni nombre de maestro.
- Si el backend 015 decide exigir `periodo_academico_id` en el body, el frontend lo agrega; mientras tanto se envía solo `modo_asistencia` + `maestro_responsable_id`.
- Normalización defensiva en frontend: `modo = String(seccion.modo_asistencia ?? 'CLASE').toUpperCase()`, para tolerar `clase`/`seccion` si el backend usa minúsculas.

**b) Secciones que el usuario puede atender — `getSeccionesAsistencia()`**

```
GET /asistencia/secciones
→ AsistenciaSeccion[]
```

Devuelve las secciones con `modo_asistencia = SECCION`:
- maestro: solo donde es responsable vigente del periodo activo;
- admin/admin_temporal: todas las SECCION del periodo activo (para el atajo del hub y para `/asistencia`);
- otros roles: 403 (no necesitan esta llamada).

```ts
export interface AsistenciaSeccion {
  seccion_id: string
  grado_id: string
  grado_nombre: string
  seccion_nombre: string
  modalidad_nombre: string
  periodo_academico_id: string
  periodo_nombre: string
  alumnos: number
  responsable_id: string
  responsable_nombre: string
  responsable_code: string
  /** Estado de la lista de hoy. */
  estado_hoy: 'pendiente' | 'incompleta' | 'lista' | 'sin_clase'
  marcas_hoy: number
  clases_hoy: number
}
```

**c) Semana de la sección — `getSemanaSeccion(seccionId, fecha?)`**

```
GET /asistencia/secciones/{seccionId}/semana?fecha=YYYY-MM-DD
→ SemanaSeccionResponse
```

```ts
export interface SemanaSeccionDia extends SemanaDia {
  clases: number
  cursos?: string[]
  /** Quién pasó la lista de ese día (histórico, no el responsable actual). */
  tomada_por_nombre?: string | null
  tomada_por_code?: string | null
  /** 'vacio' | 'uniforme' | 'mixto' cuando las clases ya tienen marcas distintas. */
  estado?: 'vacio' | 'uniforme' | 'mixto'
}

export interface SemanaSeccionMarca {
  fecha: string
  tipo_codigo?: string | null
  letra: string
  bloqueada?: boolean
  excusa_tipo?: string
  /** Criterio cuando las clases no coinciden. */
  estado?: 'vacio' | 'uniforme' | 'mixto'
  /** Maestro que registró la marca de ese día. */
  registrado_por_nombre?: string | null
  registrado_por_code?: string | null
}

export interface SemanaSeccionAlumno {
  alumno_id: string
  codigo: string
  nombre: string
  marcas: SemanaSeccionMarca[]
}

export interface SemanaSeccionResponse {
  seccion_id: string
  grado_nombre: string
  seccion_nombre: string
  modalidad_nombre: string
  periodo_nombre: string
  fecha_ref: string
  semana_inicio: string
  semana_fin: string
  dias: SemanaSeccionDia[]
  alumnos: SemanaSeccionAlumno[]
  /** Responsable vigente hoy; informativo. */
  responsable_nombre?: string | null
  responsable_code?: string | null
}
```

**d) Guardar lista de sección — `guardarListaSeccion()`**

```
POST /asistencia/secciones/{seccionId}/lista
body: { fecha: string; items: { alumno_id: string; tipo_codigo: string }[] }
→ { guardadas: number; alumnos: number; clases_afectadas: number; avisos_enviados?: number }
```

- `items` debe incluir **todo el roster** de la sección (lista completa). `tipo_codigo` ∈ `presente | tarde | justificada | injustificada`; **no se admite vacío** en modo sección.
- 400 si la sección no tiene clases programadas ese día o la fecha es futura.
- 403 si el usuario no es el responsable vigente ni admin/admin_temporal.
- 409 si alguna celda está bloqueada por excusa (mismo criterio que clase); el mensaje debe indicar el alumno.
- El backend hace fan-out y deduplica avisos: `T` y `F` un aviso por alumno/día (decisión 4).

**e) Extensiones a respuestas existentes**

```ts
export interface AsistenciaMateria {
  // ...campos actuales
  seccion_id?: string
  modo_asistencia?: ModoAsistencia
  responsable_nombre?: string | null
  responsable_code?: string | null
  /** true si el usuario en sesión es el responsable vigente de la sección. */
  es_responsable?: boolean
}

export interface MaestroDashboard {
  materia: {
    // ...campos actuales
    seccion_id?: string
    modo_asistencia?: ModoAsistencia
    responsable_nombre?: string | null
    responsable_code?: string | null
    /** true si el usuario en sesión es el responsable vigente de la sección. */
    es_responsable?: boolean
  }
  asistencia_hoy: {
    // ...campos actuales
    modo?: ModoAsistencia
    tomada_por_nombre?: string | null
    clases_afectadas?: number
  }
}

export interface InasistenciaDetalleItem {
  // ...campos actuales
  maestro_nombre?: string | null
  maestro_code?: string | null
}
```

**Regla de compatibilidad:** si `modo_asistencia` no viene, el frontend asume `CLASE` y no muestra ninguna novedad. Así la feature puede entrar por partes sin romper `/asistencia`, `/maestro` ni el dashboard.

---

## 4. Flujos de UI

### 4.1 Crear/Editar sección — `src/routes/_app/catalogos/secciones.tsx`

- Query nueva: `useQuery({ queryKey: ['periodos'], queryFn: listPeriodos })` y `const periodoActivo = periodos.find((p) => p.status === 'ACTIVE')`.
  - **Fuente del periodo activo:** `listPeriodos` (ya expone `status`). Se elige esta fuente porque el listado de secciones no necesariamente devuelve el periodo de cada configuración y porque el formulario ya está en el módulo de catálogos. Documentarlo en el código con un comentario breve.
- Bloque **«Asistencia»** dentro del `Modal`, antes de «Estado»:
  - Control segmentado con la clase existente `.segmento` / `.segmento__item` (mismo patrón que la vista Semana/Día de `AsistenciaGridModal`), `role="radiogroup"`:
    - `Por clase` — valor `CLASE`, seleccionado por defecto.
    - `Por sección` — valor `SECCION`.
    - `data-testid="seccion-modo-clase"` / `"seccion-modo-seccion"`.
  - Periodo activo en modo lectura: `Periodo: <nombre>` (`data-testid="seccion-periodo-activo"`). Si no hay periodo activo, texto «No hay periodo activo» y guardado deshabilitado (`data-testid="seccion-sin-periodo"`).
  - Si `SECCION`:
    - `Combobox` obligatorio `Maestro responsable` (`data-testid="seccion-maestro-responsable-select"`), opciones desde `listMaestros()` filtradas a `status === 'ACTIVE'`, `label = `${user_code} · ${nombre}``, `value = id`, `keywords = user_code`.
    - Error inline con `Field error=` (`data-testid="seccion-maestro-responsable-error"`): «Elige el maestro que pasará la lista de la sección».
    - Nota bajo el combo: «El responsable pasa una lista diaria para toda la sección. Los registros anteriores conservan al maestro que pasó lista.»
  - Solo `admin` y `admin_temporal` ven el bloque editable. Para el resto, si el rol tiene `catalogos:get` y abre **Ver**, el bloque se muestra en lectura con badge y nombre del responsable; en Editar (solo admin por permisos) siempre editable.
    - Helper propuesto `puedeConfigurarAsistenciaSeccion(roles)` en `src/helpers/asistencia-seccion.ts`, comparando `roles.includes('admin') || roles.includes('admin_temporal')`.
- Precarga al editar: `modo_asistencia ?? 'CLASE'`, `maestro_responsable_id ?? ''`. Si `modo === 'SECCION'` y cambia `maestro_responsable_id` respecto del original, mostrar aviso (`data-testid="seccion-aviso-cambio-responsable"`): «Los registros anteriores conservan al maestro que pasó lista. El cambio aplica desde ahora.»
- Validación antes de `setConfirmSave(true)`:
  - `SECCION` sin `maestro_responsable_id` → no abre confirmación, marca error inline y enfoca el combo.
  - `CLASE` → se envía `maestro_responsable_id: null`.
- Payload (`createSeccion`/`updateSeccion`): agregar `modo_asistencia` y `maestro_responsable_id` a `form` y a `SeccionCreate`. No mandar nombre ni código del maestro (solo id).
- Confirmación de guardado: mantener `ConfirmDialog`; si el modo pasa a `SECCION`, el mensaje agrega «La lista de esta sección la pasará <nombre>.»
- Al guardar con éxito, invalidar `['secciones']`, `['asistencia-secciones']` y `['asistencia-materias']` (el modo afecta al hub y a `/asistencia`).
- `openEdit` debe copiar los campos nuevos al `form`. `exportRows` de la tabla agrega `lista` y `responsable`.

### 4.2 Tabla de secciones (`DataTable`)

- Nueva columna **«Lista»** (`id: 'lista'`):
  - `CLASE` → `<span className="badge badge--muted">Por clase</span>`.
  - `SECCION` → `<span className="badge badge--ok">Por sección</span>` + ` <código> · <nombre>` del responsable en `texto-muted`; si falta, «Sin responsable» con `badge--warn`.
  - `data-testid={`seccion-lista-${row.codigo}`}`.
- Filtro nuevo «Lista» (`id: 'modo'`, `label: 'Lista'`, `getValue: r => r.modo_asistencia ?? 'CLASE'`, `getLabel` → «Por clase»/«Por sección»), encaja con `REG-UI-12` y `DataTableFilter`. Mantener el buscador «Buscar…» (ya lo aporta `DataTable`).
- `searchText` (nueva prop de `DataTable`) para encontrar por nombre/código del responsable además de los valores de columnas.
- `exportRows`: `{ codigo, nombre, grado, modalidad, lista, responsable, status }`.

### 4.3 Hub del maestro — `src/routes/_app/maestro/index.tsx`

- Query nueva `['asistencia-secciones']` con `getSeccionesAsistencia()` (solo si `can('asistencia:get')`). Si falla (404 mientras el backend 015 no exista), la página **no** se rompe: se oculta el botón y se registra el error como silencioso (`retry: false`, `throwOnError: false`).
- Header: botón primario **«Pasar asistencia»** (`data-testid="hub-pasar-asistencia"`) junto al título, visible si `secciones.length > 0`:
  - 1 sección → abre `AsistenciaSeccionModal` de esa sección en modo `pasar` (fecha = hoy local).
  - 2+ secciones → abre `SeccionPickerModal`; al elegir, abre la grilla de la sección.
- Tarjetas de clase (`maestro-hub__card`):
  - `m.modo_asistencia === 'SECCION'` → ocultar «Pasar lista» del menú ⋮ y mostrar chip `Asistencia por sección` (`data-testid={`maestro-hub-chip-seccion-${asignacion}`}`) bajo la meta. Opcional (no requerido): ítem «Pasar asistencia de la sección» si `m.es_responsable`, que abre la grilla de la sección; si se agrega, usar `data-testid="maestro-hub-ctx-asistencia-seccion"`.
  - `CLASE` → comportamiento actual intacto (`maestro-hub-ctx-asistencia`).
  - «Ir» (`maestro-hub-ir-*`) sigue funcionando en ambos modos.
- Invalidación: al guardar desde la grilla de sección se refrescan hub, dashboards y `/asistencia` (ver §6).

### 4.4 Selector de sección — `src/components/asistencia/SeccionPickerModal.tsx`

- `Modal` `wide`, título «Pasar asistencia», subtítulo «Tienes N secciones a tu cargo».
- Una tarjeta/fila por sección (`data-testid={`seccion-picker-item-${seccion_id}`}`) con: `grado · sec<sección>`, modalidad, «N alumnos», chip de estado de hoy (`Pendiente` / `Incompleta` / `Lista` / `Sin clase hoy`) y botón «Abrir».
- Si `estado_hoy === 'sin_clase'`, la fila se muestra con aviso y el botón se deshabilita («Sin clases hoy»), para evitar el 400.
- Cierra al elegir y delega en `onSelect(seccion)`.
- Responsive: una columna en móvil, rejilla de 2 desde 720 px; sin degradados.

### 4.5 Dashboard de clase — `src/routes/_app/maestro/clases.$asignacionId.tsx`

La tarjeta **Alumnos** ramifica por `data.materia.modo_asistencia ?? 'CLASE'` y `data.materia.es_responsable`:

- **CLASE:** idéntico a hoy (`mdash-pasar-lista`, pill/ratio y modal `AsistenciaGridModal`).
- **SECCION + responsable:**
  - Pill y ratio se alimentan de `data.asistencia_hoy` (que en modo sección representa la lista de la sección, no la clase).
  - Botón primario «Pasar asistencia» (`data-testid="mdash-pasar-asistencia-seccion"`) → `AsistenciaSeccionModal` de la sección, modo `pasar`.
  - Texto secundario «Asistencia de la sección · <grado> sec<sección>».
  - No se muestra «Pasar lista».
- **SECCION + no responsable:**
  - Sin botón de pasar. Botón ghost «Ver asistencia» (`data-testid="mdash-ver-asistencia-seccion"`) → misma grilla en modo `ver`.
  - Aviso (`data-testid="mdash-asistencia-responsable"`): «La asistencia de esta sección la registra <nombre del responsable>».
  - Pill/ratio reflejan el estado real; si el backend aún no manda datos de sección, mostrar «—» y el aviso, nunca el botón de pasar.
- Sección CLASE no se toca.
- Se requiere `seccionDesdeDashboard(data)` (helper) para construir el objeto `AsistenciaSeccion` mínimo que consume la grilla cuando el dashboard no trae la lista completa. Si faltan `seccion_id`/`alumnos`, la grilla consulta `getSemanaSeccion` y completa lo que falte.

### 4.6 Grilla de asistencia — refactor y variante de sección

**Refactor (obligatorio para no duplicar ~400 líneas):**

1. `src/components/asistencia/AsistenciaGrid.tsx` (**nuevo, presentacional**):
   - Sin fetch ni mutaciones. Recibe un modelo de vista normalizado:
     ```ts
     export type GrillaDia = { fecha: string; etiqueta: string; nota?: string; deshabilitado?: boolean }
     export type GrillaMarca = { fecha: string; letra: string; bloqueada?: boolean; excusa_tipo?: string }
     export type GrillaAlumno = { alumno_id: string; codigo: string; nombre: string; marcas: GrillaMarca[] }
     export type CambioGrilla = { alumno_id: string; fecha: string; letra: string }
     ```
   - Props: `dias`, `alumnos`, `cambios`, `onCycle(alumnoId, marca)`, `readOnly`, `saving`, `vista`, `onVistaChange`, `mostrarSelectorFecha`, `fechaRef`, `onFechaRefChange`, `filtro`, `onFiltroChange`, `toolbarExtra`, `leyendaExtra`, `aviso`, `footer`, `inline`, `titulo`.
   - Conserva exactamente: tabla `data-testid="asistencia-semana-table"`, celdas `asistencia-celda-<codigo>-<fecha>`, atributos `data-letra`/`data-dia`/`data-cambio`/`data-bloqueada`, clases `asistencia-celda--*`, leyenda, candado de excusa y bloqueo de días futuros.
   - El placeholder del buscador sigue siendo «Buscar…» vía `SearchInput`.
2. `src/components/asistencia/useBorradorAsistencia.ts` (**nuevo, opcional pero recomendado**):
   - Encapsula `cambios`, `cycleCelda`, `descartar`, `totalCambios`, `confirmGuardar`, `confirmSalir` y las reglas de bloqueo (futuro/excusa). Devuelve también `setCambios` para que cada modal haga su propio guardado.
   - Si no se extrae, el ciclo debe vivir en un solo lugar: prohibido duplicarlo en `AsistenciaSeccionModal`.
3. `src/components/asistencia/AsistenciaGridModal.tsx` (**modificar, no reescribir**):
   - Mantiene su API pública `{ materia, mode, onClose, inline, extraActions }` y todo su comportamiento actual.
   - Internamente: `getSemanaAsistencia`/`guardarLista` + `AsistenciaGrid` + `useBorradorAsistencia`.
   - `todayISO()` se reemplaza por `hoyISO()` de `src/lib/fechas-padre.ts` (regla de zona horaria del repo). Aplica también a la grilla de sección.
   - Los test ids existentes se conservan (los e2e de `asistencia.spec.ts` deben seguir pasando sin cambios).

**Nuevo `AsistenciaSeccionModal.tsx`:**

- Props: `{ seccion: AsistenciaSeccion; mode: 'pasar' | 'editar' | 'ver'; onClose: () => void; inline?: boolean; fechaInicial?: string }`.
- Título (`inline` = `h1`, modal = título): `Asistencia · <grado> <sección> · <periodo>` — **sin curso**.
- `data-testid="asistencia-seccion-modal"`.
- Vista por defecto: `día` en modo `pasar`, `semana` en `editar`/`ver`; el usuario puede alternar Semana/Día igual que hoy.
- Selector de fecha: solo en `editar`/`ver`; `max = hoyISO()` y bloqueado mientras haya cambios (mismo patrón actual).
- Ciclo de celda en modo sección: **A → T → E → F → A** (sin vacío), `LETRA_CYCLE_SECCION` + `nextLetraSeccion()` en `services/asistencia.ts`. Días futuros y celdas con excusa siguen bloqueados.
- Estado inicial: si el día no tiene registro de sección, las celdas se pintan con **A** en el borrador (todos presentes por defecto). Los cambios respecto de lo cargado alimentan «Guardar (n)».
- Meta de la grilla (`data-testid="asistencia-seccion-meta"`):
  - `Tomada por: <maestro>` (`data-testid="asistencia-seccion-tomada-por"`) cuando el día ya tiene marcas; usar `tomada_por_nombre`/`registrado_por_nombre` del backend, **nunca** el responsable actual.
  - `Clases afectadas hoy: N` (`data-testid="asistencia-seccion-clases-afectadas"`), de `dias[].clases` o `clases_hoy`.
  - `Responsable vigente: <nombre>` en modo `editar`/`ver` de admin, para distinguir vigente vs. histórico.
- Criterio mixto: si `dias[].estado === 'mixto'` o alguna marca viene `estado: 'mixto'`, mostrar banner (`data-testid="asistencia-seccion-mixto"`): «Las clases de este día tienen marcas distintas. Al guardar, se unificará toda la sección con la lista que marques.» y exigir confirmación extra en el `ConfirmDialog` de guardado.
- Guardado:
  - `guardarListaSeccion(seccion.seccion_id, { fecha, items })` con **todos** los alumnos y `A` para los no marcados.
  - `ConfirmDialog` (`data-testid="asistencia-seccion-confirmar"`) con: «Se guardará la asistencia de N alumnos y afectará a M clases. Se avisará a los padres de faltas y tardanzas.»
  - Snackbar de éxito: «Asistencia de la sección guardada»; recarga la semana y limpia el borrador.
  - Error: `toast.error(userMessageFromError(e))`; si es 400 por «sin clases», mostrar además `empty-state` inline con el mensaje del backend; recargar.
- Descargar PDF: **fuera de alcance** en esta versión (no hay endpoint de PDF de sección). No mostrar botón en la grilla de sección.
- `inline` se usa en `/asistencia` para el maestro responsable solo si se decide reemplazar la grilla de clase; en esta spec el maestro sigue viendo su grilla de clase inline y accede a la general desde `/maestro` o el dashboard. El modo `inline` queda implementado para reutilización futura y para el dashboard si se opta por embeberlo.

### 4.7 Pantalla administrativa `/asistencia` — `src/routes/_app/asistencia.tsx`

- Tabla de clases (`listMateriasAsistencia`):
  - Nueva columna **«Lista»** con badge y responsable (mismo render que §4.2). Para filas `SECCION`, badge «Por sección» + `<responsable_code> · <responsable_nombre>`.
  - Filtro «Lista» (`modo`) y `searchText` con grado/sección/responsable.
  - `exportRows` agrega `lista` y `responsable`.
- Acciones por fila:
  - `CLASE` → igual que hoy: `Asistencia` (`pasar`/`editar` según `canPost`) usa `AsistenciaGridModal`.
  - `SECCION` → `Asistencia` y `Editar` abren `AsistenciaSeccionModal`:
    - admin/admin_temporal con `asistencia:post` → modo `editar` (puede corregir días pasados; hoy sigue editable). `data-testid="asistencia-ctx-seccion"`.
    - roles sin `asistencia:post` → modo `ver` (solo lectura).
  - `Ver` en una fila SECCION abre la grilla de sección en `ver` (más útil que la grilla de la clase).
  - `Ver faltas` sigue abriendo `InasistenciasModal` de la **clase** (los puntos y las faltas siguen por asignatura). Documentar que el conteo es por clase, no por sección.
  - Si una sección SECCION tiene N clases, aparecen N filas que abren la misma grilla de sección. Es aceptable y explícito; agrupar filas por sección queda fuera de alcance.
- Maestro (`isMaestroRole(roles)`): conserva la grilla inline de su clase. Si su clase pertenece a una sección SECCION:
  - la grilla inline se fuerza a `mode="ver"` (`modo_asistencia === 'SECCION' ? 'ver' : canPost ? 'editar' : 'ver'`), porque el backend rechaza escrituras de clase en una sección SECCION;
  - responsable → se agrega un acceso «Pasar asistencia de la sección» (`data-testid="asistencia-seccion-acceso"`) que abre `AsistenciaSeccionModal` en `pasar`;
  - no responsable → solo lectura y aviso «La asistencia de esta sección la registra <maestro>».
  - Si `getSeccionesAsistencia` falla, se mantiene el comportamiento actual sin romper la pantalla.
- No se agrega un botón global «Asistencia por sección» en `/asistencia`: la acción vive en la fila y el atajo del hub. (Se documenta como decisión de esta capa.)

### 4.8 Inasistencias — `InasistenciasModal` (en `src/routes/_app/asistencia.tsx`)

- Extender `InasistenciaDetalleItem` con `maestro_nombre?` / `maestro_code?`.
- Columna nueva «Registró» en el detalle (`data-testid="asistencia-detalle-registro"`):
  - Si viene `maestro_nombre`, mostrar `<nombre>` (y código en tono suave si existe).
  - Si no viene, `—`. **Nunca** rellenar con el responsable actual.
- La tabla resumen (faltas/excusas/tardes) no cambia: el histórico por clase sigue igual.
- Si en el futuro se migra el modal a `useQuery`, usar `['asistencia-inasistencias', asignacionId]` e invalidarlo al guardar asistencia. Hoy usa estado local; no requiere invalidación.

---

## 5. Archivos a crear y modificar

### Crear

| Ruta | Contenido |
|---|---|
| `src/components/asistencia/AsistenciaGrid.tsx` | Grilla presentacional compartida (tabla, celdas, leyenda, toolbar, buscador) |
| `src/components/asistencia/useBorradorAsistencia.ts` | Hook de borrador/ciclo/confirmaciones compartido |
| `src/components/asistencia/AsistenciaSeccionModal.tsx` | Wrapper de sección: fetch, guardado completo, historial y banner mixto |
| `src/components/asistencia/SeccionPickerModal.tsx` | Selector cuando el responsable tiene varias secciones |
| `src/components/asistencia/PasarAsistenciaSeccionBoton.tsx` | Botón general reutilizable (hub y dashboard) con lógica 1 vs. N secciones |
| `src/helpers/asistencia-seccion.ts` | `normModoAsistencia`, `esModoSeccion`, `puedeConfigurarAsistenciaSeccion(roles)`, `seccionDesdeMateria`, `seccionDesdeDashboard`, `etiquetaModo` |
| `src/tests/e2e/asistencia-seccion.spec.ts` | Pruebas e2e de la feature |

### Modificar

| Ruta | Cambio |
|---|---|
| `src/services/catalogos.ts` | `ModoAsistencia`, campos nuevos en `Seccion`/`SeccionCreate` |
| `src/services/asistencia.ts` | `AsistenciaMateria` extendido, tipos de sección, `getSeccionesAsistencia`, `getSemanaSeccion`, `guardarListaSeccion`, `LETRA_CYCLE_SECCION`/`nextLetraSeccion`, campos de maestro en detalle de inasistencias |
| `src/services/maestro-dashboard.ts` | `modo_asistencia`, `seccion_id`, `responsable_*`, `asistencia_hoy.modo/tomada_por_nombre/clases_afectadas` |
| `src/routes/_app/catalogos/secciones.tsx` | Bloque Asistencia, validación, periodo activo, columna/filtro «Lista», payload |
| `src/routes/_app/maestro/index.tsx` | Botón general, selector, chip, ocultar «Pasar lista» en SECCION |
| `src/routes/_app/maestro/clases.$asignacionId.tsx` | Ramas CLASE / SECCION responsable / SECCION no responsable |
| `src/routes/_app/asistencia.tsx` | Columnas/filtro, acción de sección, guardas del maestro, columna «Registró» |
| `src/components/asistencia/AsistenciaGridModal.tsx` | Refactor para usar `AsistenciaGrid` + `hoyISO`, API intacta |
| `src/styles/style1.css` | Solo si hace falta: variantes de badge/chip de sección y `.seccion-picker`; **sin degradados** |

> `style2.css` hereda de `style1.css`; no se toca salvo que un token nuevo lo requiera (no se prevé).

---

## 6. Estado y consultas (TanStack Query)

| Query key | Dónde | Cuándo |
|---|---|---|
| `['secciones']` | secciones | listado; se invalida al guardar configuración |
| `['periodos']` | secciones | periodo activo del formulario |
| `['maestros']` | secciones | opciones del responsable (si no existe ya, crearla con `listMaestros`) |
| `['asistencia-materias']` | hub, dashboard, `/asistencia` | compartida (no duplicar keys) |
| `['asistencia-secciones']` | hub, `/asistencia` (admin) | nuevas |
| `['asistencia-semana-seccion', seccionId, fechaRef]` | `AsistenciaSeccionModal` | nueva |
| `['maestro-dashboard', asignacionId, fecha]` | dashboard | existente; se refresca cada 60 s |
| `['asistencia-inasistencias', asignacionId]` | opcional (si se migra el modal) | nueva, solo si aplica |

**Guardar lista de sección invalida:**

```ts
qc.invalidateQueries({ queryKey: ['asistencia-secciones'] })
qc.invalidateQueries({ queryKey: ['asistencia-semana-seccion', seccionId] })
qc.invalidateQueries({ queryKey: ['asistencia-materias'] })
qc.invalidateQueries({ queryKey: ['maestro-dashboard'] }) // por prefijo: todos los dashboards
qc.invalidateQueries({ queryKey: ['asistencia-inasistencias'] })
```

**Guardar configuración de sección invalida:** `['secciones']`, `['asistencia-secciones']`, `['asistencia-materias']`, `['maestro-dashboard']`.

**Buenas prácticas:** `enabled` para no consultar secciones si el rol no tiene `asistencia:get`; `retry: false` en `getSeccionesAsistencia` mientras el backend 015 no exista; `staleTime` corto (15 s) en la semana de sección para ver cambios de otro dispositivo.

---

## 7. Permisos y roles

| Acción | Frontend | Backend (015) |
|---|---|---|
| Ver bloque Asistencia en sección | `catalogos:get` | — |
| Cambiar modo/responsable | rol `admin`/`admin_temporal` + `catalogos:post`/`catalogos:put` (`Can`) | valida rol y periodo activo |
| Pasar lista de sección | `asistencia:post` **y** `es_responsable`/lista de secciones | valida responsable vigente |
| Corregir sección (admin) | `asistencia:post` | admin/admin_temporal |
| Maestro de clase en SECCION | solo lectura (ocultar acciones de escritura) | 403 si escribe |
| Coordinador/director/secretaría/consejería | solo lectura (`asistencia:get`, sin `post`) | solo lectura |
| Ver grilla de sección | `asistencia:get` | pertenencia/rol |

- **No se agrega permiso.** Ni a `ROLE_PERMISSIONS` ni a `nav.ts`.
- `Can`/`useCan` solo deciden visibilidad; la autoridad final es el backend (validación de responsable).
- `es_responsable` viene del backend y manda sobre `can('asistencia:post')` para ocultar el botón. Nunca mostrar «Pasar lista» a un maestro de clase en SECCION por el hecho de tener `asistencia:post`.

---

## 8. Manejo de errores y casos borde

- **Sin periodo activo:** formulario de sección bloquea el guardado, muestra «No hay periodo activo» y no permite `SECCION`.
- **Sin maestro seleccionado:** error inline; no abre `ConfirmDialog`.
- **Maestro inactivo/dado de baja:** `listMaestros` solo activos; si la sección ya apunta a uno inactivo, el `Combobox` muestra el id sin etiqueta y un aviso «El responsable ya no está activo; elige otro». El backend debe permitir corregirlo.
- **Sección sin clases ese día:** backend 400 → toast con el mensaje + `empty-state` dentro de la grilla; el botón de guardar queda deshabilitado mientras no haya días con clase.
- **Fecha futura:** `input[type=date]` con `max={hoyISO()}` y celdas de días futuros no editables (ya existe el patrón). El backend también rechaza.
- **Excusa registrada:** celda con candado; al intentar cambiarla, toast informativo. Si el 409 llega al guardar, se recarga la semana y se preserva el borrador.
- **Marcas mixtas:** banner + confirmación; el guardado sobrescribe con la lista unificada.
- **Cambio de responsable en el mismo periodo:** el formulario avisa; tras guardar se invalida `['secciones']` y `['asistencia-secciones']`; los registros viejos mantienen `tomada_por_*` del backend.
- **Responsable con varias secciones:** selector; si una está `sin_clase` hoy, se deshabilita esa fila.
- **Sin alumnos matriculados:** `empty-state` «Sin alumnos matriculados».
- **Error de red:** `toast.error(userMessageFromError(e))` (imprime `[api] …` desde `apiRequest`); no se pierde el borrador salvo tras recarga exitosa.
- **Backend 015 aún no desplegado:** `modo_asistencia` ausente ⇒ todo se comporta como CLASE; `getSeccionesAsistencia` 404 ⇒ se oculta el botón general. Cero regresiones.
- **Móvil (< 768px):** grilla con scroll horizontal, toolbar apilada, celdas más grandes (mismo criterio que hoy). El selector y los modales ocupan el ancho; sin degradados.

---

## 9. Pruebas

### 9.1 E2E nuevos — `src/tests/e2e/asistencia-seccion.spec.ts`

Usuarios de fixture (contraseña `Admin123!`): admin `1002026100`, maestro `1002026501`, consejería `1002026602`. Ajustar al fixture del backend 015 si crea un maestro responsable dedicado.

1. **Admin configura Por sección:** login admin → `/catalogos/secciones` → Editar una sección → radio «Por sección» → elegir maestro por código → guardar/confirmar → la fila muestra badge «Por sección» y `código · nombre`; recargar y la configuración persiste.
2. **Validación:** guardar `SECCION` sin maestro no abre confirmación y muestra `seccion-maestro-responsable-error`.
3. **Responsable ve y usa el botón general:** login maestro responsable → `/maestro` → `hub-pasar-asistencia` visible → abre grilla → título `Asistencia · <grado> <sec> · <periodo>` → marca una celda → «Guardar (n)» → confirmación con «N alumnos y M clases» → guardado exitoso.
4. **Marcas visibles desde otro dashboard de la misma sección:** abrir el dashboard de otra clase de la sección → el estado del día coincide y la grilla muestra las mismas marcas y «Tomada por».
5. **Maestro de clase no puede editar:** login maestro no responsable de una sección SECCION → su dashboard muestra «Ver asistencia» y el aviso; no existe `mdash-pasar-lista`; en `/asistencia` la grilla de sección abre en `ver`.
6. **Admin corrige:** admin en `/asistencia` → fila SECCION → «Asistencia»/«Editar» → cambia una marca de un día pasado → guarda → se refleja al reabrir.
7. **Cambio de responsable conserva el histórico:** admin cambia el responsable → una lista antigua sigue mostrando `Tomada por: <maestro anterior>`; una lista nueva muestra al nuevo.
8. **Modo Por clase sigue igual:** una sección `CLASE` conserva `Pasar lista` en el hub y en el dashboard, y el flujo actual guarda sin cambios.
9. **Inasistencias:** el detalle muestra «Registró» con el maestro de cada marca cuando el backend lo devuelve.

### 9.2 Regresión

- `src/tests/e2e/asistencia.spec.ts` (inline del maestro, borrador, guardado, días futuros, inasistencias, consejería).
- `src/tests/e2e/maestro-hub.spec.ts` (Ir, pasar lista, navegación).
- `src/tests/e2e/catalogos.spec.ts` (crear/editar sección).
- `src/tests/e2e/bajas-restauracion.spec.ts` (maestros activos en combobox).
- `src/tests/e2e/permisos.spec.ts` (no nuevas entradas de menú).

### 9.3 Comandos

```powershell
pnpm lint
pnpm exec tsc --noEmit
pnpm build
pnpm test:e2e:smoke
pnpm exec playwright test src/tests/e2e/asistencia-seccion.spec.ts
pnpm exec playwright test src/tests/e2e/asistencia.spec.ts src/tests/e2e/maestro-hub.spec.ts
```

> `pnpm check` (prettier) antes del commit. Los e2e levantan backend en :8081 y front en :3001 con reset de `molde_test` (ver `MAPA.md`).

---

## 10. Riesgos

- **Fan-out y avisos duplicados:** la réplica a N clases puede duplicar notificaciones. Mitigación en backend 015 (T y F una por alumno/día). El frontend solo muestra el texto de advertencia; no controla el envío.
- **Doble fuente de verdad del modo:** usar siempre `modo_asistencia` del backend; nunca inferirlo de la presencia de responsable. Si falta el campo, `CLASE`.
- **Permiso vs. responsabilidad:** `asistencia:post` lo tienen todos los maestros. Ocultar el botón con `es_responsable`, no con el permiso.
- **Responsable sin asignaciones:** el hub no puede depender de `asistencia-materias`; requiere `GET /asistencia/secciones`. Si el backend no lo implementa, la feature queda invisible (degradación segura), no rota.
- **Refactor de 400 líneas:** riesgo de romper test ids y estilos. Mitigación: extracción presentacional sin cambiar clases ni `data-testid`, y correr los e2e actuales de asistencia antes de agregar la variante.
- **Duplicación en `/asistencia`:** N filas por sección SECCION. Aceptado; se documenta y se filtra por «Lista».
- **Histórico:** no pintar `responsable_nombre` vigente en días viejos. Usar `tomada_por_*`/`registrado_por_*` y `—` si no vienen.
- **Cache:** invalidar por prefijo `['maestro-dashboard']` para que todos los dashboards de la sección reflejen el guardado.
- **Zona horaria:** unificar en `hoyISO()`; no usar `toISOString()`.
- **Alcance del PDF:** no ofrecer PDF de sección mientras no exista endpoint; evitar un 404 confuso.

---

## 11. Fuera de alcance

- Implementación backend, migración SQL, fan-out, validación de responsable e historial (spec 015).
- Tabla/endpoint separado de asistencia de sección.
- Nuevos permisos o entradas de menú.
- PDF/Excel de asistencia de sección.
- Agrupar `/asistencia` por sección (una fila por sección en lugar de una por clase).
- Cambios en el portal del alumno/responsable o en la app Flutter.
- Backfill de registros históricos al cambiar de modo.
- Notificaciones push nuevas (se reutiliza el motor de avisos existente).

---

## 12. Criterios de aceptación

1. El formulario de sección muestra «Por clase» por defecto y «Por sección»; solo admin/admin temporal puede cambiarlo.
2. En modo sección exige maestro responsable (búsqueda por código o nombre, opciones activas) y guarda `modo_asistencia` + `maestro_responsable_id`; no acepta texto libre.
3. El formulario muestra el periodo activo y advierte que el cambio aplica desde ahora sin reescribir registros anteriores.
4. La tabla de secciones muestra badge «Por clase»/«Por sección», responsable vigente y filtro por modo, manteniendo «Buscar…».
5. El maestro responsable ve «Pasar asistencia» en `/maestro`; con una sección abre directo y con varias ve un selector con grado, sección, modalidad, alumnos y estado de hoy.
6. En tarjetas SECCION se oculta «Pasar lista» y se muestra «Asistencia por sección»; «Ir» sigue funcionando.
7. El dashboard de una clase SECCION muestra «Pasar asistencia» al responsable, «Ver asistencia» + aviso al no responsable, y conserva el comportamiento en CLASE.
8. La grilla de sección se titula `Asistencia · <grado> <sección> · <periodo>`, tiene una fila por alumno, celdas A/T/E/F con ciclo sin vacío, «Guardar (n)», «Buscar…», días futuros deshabilitados y días pasados editables.
9. Al guardar se envía la lista completa, se confirma «N alumnos y M clases» y se avisa que faltas/tardanzas notifican a los padres.
10. Se muestra «Tomada por» con el maestro histórico del día y «Clases afectadas hoy: N»; nunca el responsable actual en registros viejos.
11. Si hay marcas mixtas, se muestra el criterio y se permite sobrescribir con confirmación.
12. `/asistencia` muestra modo y responsable, abre la grilla de sección para filas SECCION y mantiene solo lectura a quienes no tienen `asistencia:post`.
13. El detalle de inasistencias muestra al maestro que registró cada marca cuando el backend lo devuelve.
14. No hay degradados; solo tokens; buscadores con «Buscar…»; formularios con `Modal`/`Field`/`Combobox`/`ConfirmDialog`; acciones con `data-testid`; comportamiento responsive.
15. Los e2e nuevos y la regresión de asistencia/hub/catálogos pasan; `lint`, `tsc --noEmit` y `build` sin errores.
16. Sin `modo_asistencia` en backend, todo sigue funcionando como hoy (modo clase).

---

## 13. Documentación pendiente (no editar ahora)

Al terminar la implementación, **preguntar** antes de actualizar:

- `sasha_fronted/documentacion/MAPA.md`: filas de `/catalogos/secciones`, `/maestro`, `/maestro/clases/$asignacionId`, `/asistencia` y la sección «Componentes que importan» (`AsistenciaGrid`, `AsistenciaSeccionModal`, `SeccionPickerModal`).
- `sasha_fronted/documentacion/API_CLIENTES.md`: `GET /asistencia/secciones`, `GET /asistencia/secciones/{id}/semana`, `POST /asistencia/secciones/{id}/lista` y campos nuevos de sección/`asistencia/materias`/`maestro/dashboard`/inasistencias.
- `sasha_fronted/documentacion/EVOLUCION.md`: bitácora de la feature.
- `backend_sasha/documentacion/MAPA.md` y `API_CLIENTES.md` en la spec 015 (fuera de esta capa).

> No se edita ninguno en este paso. La regla `MAPA` exige preguntar antes de tocarlos y antes de incluirlos en un commit.
