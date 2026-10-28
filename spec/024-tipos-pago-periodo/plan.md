# Plan de Especificación: Tipos de pago por periodo — Frontend

> Feature `024-tipos-pago-periodo` · Frontend Sasha (React 19 + TanStack Start) · v1
> Capa: **frontend** (`sasha_fronted/`).
> Espejo previsto de la spec backend correspondiente (propuesta `016-tipos-pago-periodo`; esa spec **aún no existe** y este plan fija el contrato que el backend debe cumplir).
> Estado: **propuesta para implementación**. No se implementó código al escribir este documento.
> Reglas del repo: sin degradados; solo tokens `--sasha-*`; buscador «Buscar…» (`REG-UI-11`); registros con `DataTable` (`REG-UI-12`); modales `Modal`/`Field`/`Combobox`/`ConfirmDialog`; permisos con `Can`/`useCan`; `data-testid` en acciones.
>
> **Objetivo:** que contabilidad, admin y admin temporal puedan definir, por periodo, **qué meses se cobran** y **qué tipos de pago existen** (mensualidad, matrícula y tipos adicionales periódicos o únicos, con destinos y bandera de bloqueo de notas), y que caja pueda cobrar esos conceptos sin romper el flujo actual de obligaciones.

---

## 0. Metadatos

| Campo | Valor |
|---|---|
| Feature | `024-tipos-pago-periodo` |
| Capa | Frontend |
| Spec backend relacionada | `016-tipos-pago-periodo` (pendiente de crear) |
| Estado | Propuesta / lista para `sdd-checklist` |
| Depende de | Extensión de `/pagos/configuracion/*`, nuevos endpoints de tipos por periodo, obligaciones por tipo, campo `bloquea_notas` y respuestas de liberación/portal |
| No incluye | Implementación backend, migración SQL, app Flutter, tabla nueva de asistencia, cambios en el motor de cobro |
| Fecha | 2026-10-26 |
| Roles que usan la feature | `contabilidad`, `admin`, `admin_temporal` |
| Permiso | `pagos_config:get` / `pagos_config:put` (sin permiso nuevo) |

---

## 1. Contexto y problema

Hoy la configuración de pagos por periodo solo define **día de pago**, **monto de mensualidad/matrícula por grado** y **reglas de mora**, y la caja (`/pagos`) lista únicamente **mensualidades**. Los tipos de pago (`tipo_pago`) existen en la base como conceptos globales (`mensualidad`, `matricula`) y no hay una pantalla para que contabilidad defina conceptos propios del periodo (por ejemplo, «Cuota de laboratorio», «Uniforme», «Gira»), ni para decidir qué meses se cobran, ni para que un concepto distinto a la mensualidad bloquee la liberación de notas.

La feature agrega:

1. **Meses de cobro por periodo** en el modal de `/configuracion-pagos`, con selección explícita de enero–diciembre (y del año siguiente si el periodo cruza año), validación de al menos uno y explicación de la retroactividad.
2. Una página **`/tipos-pagos`** con una fila por periodo y un modal para administrar los conceptos de ese periodo.
3. **Tipos adicionales** por periodo, con nombre, descripción, monto, periodicidad (periódico/único), destinos (modalidad/grado/sección/alumnos/cursos) y bandera **Bloquea notas**.
4. **Caja** que muestra y cobra matrícula y tipos adicionales manteniendo el cobro por `obligacion_pago_ids`.
5. **Visualización** del bloqueo de notas cuando viene de un tipo distinto a la mensualidad.

**Alcance de esta capa:** rutas, componentes, servicios/tipos, invalidaciones de TanStack Query, permisos, navegación, command palette, e2e y regresión. **No** se implementa la lógica de bloqueo de notas, la generación de obligaciones, el recálculo retroactivo ni la migración: eso vive en backend.

---

## 2. Historia de usuario y criterios de aceptación

### 2.1 Historia principal

Como **contabilidad, admin o admin temporal**, quiero **definir los meses que se cobran y los tipos de pago de cada periodo**, para que **caja pueda cobrar los conceptos correctos y la liberación de notas respete el bloqueo configurado**, sin crear permisos nuevos ni salir de la configuración de pagos existente.

### 2.2 Criterios de aceptación

- **Dado** un periodo activo, **cuando** abro su configuración de pagos, **entonces** veo una sección «Meses que se cobran» con los meses del periodo (y del año siguiente si cruza), los meses del periodo marcados por defecto y puedo marcar/desmarcar.
- **Dado** que no dejo ningún mes marcado, **cuando** intento guardar, **entonces** veo un error «Marca al menos un mes» y el botón Guardar queda deshabilitado.
- **Dado** un periodo que ya tenía configuración, **cuando** guardo con meses desmarcados, **entonces** el diálogo retroactivo explica que las obligaciones pendientes/en mora de esos meses se inactivan y que los meses con pagos registrados bloquean el cambio.
- **Dado** que abro `/tipos-pagos`, **entonces** veo una fila por periodo, sin botón «Agregar periodo», con columnas Periodo, Año lectivo, Estado, Tipos y Meses configurados si el backend los devuelve, filtros Año/Estado y exportación.
- **Dado** que hago clic derecho o doble clic en un periodo, **entonces** se abre el modal de tipos del periodo; en móvil uso el menú de 3 puntos.
- **Dado** el modal de tipos, **entonces** veo «Pagos fijos» (Mensualidad y Matrícula, no eliminables, con badges Fijo/Periódico/Único) y «Tipos adicionales» con «Agregar tipo».
- **Dado** un tipo adicional, **cuando** lo creo o edito, **entonces** puedo definir nombre, descripción, monto, Periódico/Único, «Bloquea notas» (activo por defecto) y destinos por modalidad/grado/sección/avanzado.
- **Dado** que no marco destinos, **entonces** el tipo aplica a todos los alumnos del periodo; si marco varios, se aplican con **OR**; dentro de una regla los campos son **AND**.
- **Dado** un tipo periódico, **entonces** usa los meses seleccionados en la configuración del periodo; **dado** uno único, **entonces** muestro «Fecha de vencimiento» con la fecha sugerida del periodo.
- **Dado** un tipo adicional, **entonces** puedo editarlo y eliminarlo con `ConfirmDialog danger`; los fijos no se eliminan.
- **Dado** `/pagos`, **entonces** veo mensualidades, matrícula y tipos adicionales con columna y filtro «Tipo», y puedo cobrarlos por obligación manteniendo el flujo actual.
- **Dado** un tipo con «Bloquea notas», **entonces** la UI de liberación/portal muestra el bloqueo con el nombre del tipo si el backend lo devuelve; el frontend **no** calcula el bloqueo.
- **Dado** un rol sin `pagos_config:put`, **entonces** puede ver pero no crear, editar ni eliminar.

---

## 3. Decisiones aprobadas (no reabrir)

1. **Meses por periodo, no por tipo.** Los meses se guardan en la configuración del periodo y los usan todos los tipos periódicos. El admin puede dejar 12 meses aunque el periodo dure 10; solo se exige al menos uno.
2. **Enviar `meses` al backend.** El contrato usa `MesCobro[]` (`{ anio, mes }`) porque un periodo puede cruzar año; la UI muestra etiquetas y el backend decide la vigencia. Si el backend 016 prefiere `number[]`, el adaptador se hace en `helpers/configuracion-pagos.ts` sin cambiar la UI.
3. **Página `/tipos-pagos` separada.** No se duplica la tabla dentro de `/configuracion-pagos`; allí solo se agrega la sección de meses. La nueva página no tiene «Agregar periodo» (los periodos se crean en Catálogos → Periodos).
4. **Una fila por periodo.** Los tipos se ven en el modal, no como filas de la tabla principal. Clic derecho «Ver» y doble clic; en móvil menú de 3 puntos.
5. **Fijos no eliminables.** Mensualidad y Matrícula son fijos. Mensualidad permite editar meses; Matrícula no tiene meses. El monto de ambos por grado se edita en `/configuracion-pagos`; desde el modal de tipos solo se enlaza/indica.
6. **Adicionales con CRUD completo.** Los tipos adicionales se crean, editan y eliminan; su eliminación solo procede si no tienen obligaciones generadas (ver §10).
7. **Destinos por reglas.** Sin reglas = todos los alumnos del periodo. Varias reglas = OR. Dentro de una regla los campos son AND. Avanzado permite cursos y alumnos específicos.
8. **`bloquea_notas` es un flag de configuración/visualización.** Por defecto activo en tipos adicionales y editable en los fijos. El backend decide qué obligaciones bloquean; el frontend solo guarda el flag y muestra el mensaje o los chips que devuelve el backend.
9. **Permisos existentes.** Se reutiliza `pagos_config:get`/`pagos_config:put`. No se crea permiso nuevo ni se toca `ROLE_PERMISSIONS`.
10. **Contabilidad no tiene `catalogos:get`.** Las opciones de modalidad/grado/sección/curso/alumno vienen de un endpoint bajo `pagos_config:get`, no de `/catalogos/*`.
11. **Caja mantiene el flujo de obligaciones.** No se crea un cobro nuevo: se sigue usando `POST /pagos/cobro` con `obligacion_pago_ids`. La tabla y el modal se extienden, no se reescriben.
12. **Degradación segura.** Todos los campos nuevos son opcionales en los tipos del frontend. Sin backend 016, `/pagos`, `/recibos`, `/liberacion-notas` y `/configuracion-pagos` siguen funcionando como hoy.

---

## 4. Modelo de datos y contrato con el backend

### 4.1 Lo que existe hoy (verificado en código y `API_CLIENTES.md`)

- `GET /pagos/configuracion/periodos` → `PeriodoConfigLista[]` (`id`, `nombre`, `anio_lectivo`, `status`).
- `GET /pagos/configuracion/{periodo_id}` → `ConfiguracionPagos` (`periodo_id`, `dia_pago`, `existe`, `grados[]` con `monto`, `monto_matricula`, `reglas_mora`).
- `PUT /pagos/configuracion/{periodo_id}` → `ConfiguracionPagosUpdate` (`dia_pago`, `retroactivo`, `grados[]`).
- `GET /pagos/mensualidades` → `MensualidadFila[]` **solo mensualidades**.
- `GET /pagos/alumnos/{code}/mensualidades` → `MensualidadesAlumno` con `meses[]` **solo mensualidades**.
- `POST /pagos/cobro` con `obligacion_pago_ids` cobra varias obligaciones.
- `GET /pagos/cartera/alumnos`, `GET /pagos/cartera/padres`, `GET /pagos/analitica`, `GET /pagos/recibos`.
- `GET /calificaciones/liberacion/estado`, `GET /calificaciones/liberacion/bloqueados`.
- `GET /portal/clases/{asig}/calificaciones`, `GET /portal/resumen`, `GET /portal/resultado`.
- `tipo_pago` global (`codigo`, `nombre`, `es_periodico`, `monto_default`, `status`) y `obligacion_pago` (`tipo_pago_id`, `anio`, `mes`, `mora_monto`, `estado`).

### 4.2 Contrato propuesto (marcado como **NUEVO** o **EXTENDIDO**)

> Nada de lo marcado como NUEVO existe todavía. Lo EXTENDIDO conserva los campos actuales y agrega campos opcionales. El frontend debe tolerar que los campos nuevos no vengan.

#### a) Meses de cobro — EXTENDIDO

```ts
/** Mes concreto de cobro. `etiqueta` puede venir del backend; si no, se arma en el helper. */
export interface MesCobro {
  anio: number
  mes: number
  etiqueta?: string
}

/** Opción que se pinta en «Meses que se cobran». */
export interface MesCobroOpcion extends MesCobro {
  etiqueta: string
  /** true si cae dentro de fecha_inicio–fecha_fin del periodo. */
  en_periodo: boolean
  /** true si ya está en la configuración guardada. */
  configurado: boolean
  /** Hay obligaciones pendientes o en mora de ese mes. */
  tiene_pendientes: boolean
  /** Hay pagos registrados de ese mes: no se puede desmarcar. */
  tiene_pagos: boolean
  /** Atajo del backend: true = deshabilitar el checkbox. Normalmente igual a `tiene_pagos`. */
  bloqueado: boolean
}
```

`PeriodoConfigLista` — **EXTENDIDO** (lo usan `/configuracion-pagos` y `/tipos-pagos`):

```ts
export interface PeriodoConfigLista {
  id: string
  nombre: string
  anio_lectivo: number
  status: string
  /** NUEVO: fechas del periodo para construir meses si el backend no manda opciones. */
  fecha_inicio?: string
  fecha_fin?: string
  /** NUEVO: meses configurados, para la columna «Meses» de /tipos-pagos. */
  meses?: MesCobro[]
  /** NUEVO: resumen de chips «Mensualidad / Matrícula / +N adicionales». */
  tipos_resumen?: {
    mensualidad: boolean
    matricula: boolean
    adicionales: number
    nombres_adicionales?: string[]
  }
}
```

`ConfiguracionPagos` — **EXTENDIDO**:

```ts
export interface ConfiguracionPagos {
  periodo_id: string
  dia_pago: number
  existe: boolean
  grados: ConfigGrado[]
  /** NUEVO */
  meses?: MesCobro[]
  /** NUEVO: meses que abarca el periodo, usados cuando no hay configuración previa. */
  meses_sugeridos?: MesCobro[]
  /** NUEVO: detalle para deshabilitar meses con pagos y avisar de pendientes. */
  meses_opciones?: MesCobroOpcion[]
  /** NUEVO: resultado del guardado cuando se quitaron meses. */
  meses_inactivados?: number
  obligaciones_inactivadas?: number
}
```

`ConfiguracionPagosUpdate` — **EXTENDIDO**:

```ts
export interface ConfiguracionPagosUpdate {
  dia_pago: number
  retroactivo: boolean
  grados: {
    grado_id: string
    monto: number
    monto_matricula: number
    reglas_mora: ReglaMora[]
  }[]
  /** NUEVO: obligatorio; al menos un mes. */
  meses: MesCobro[]
}
```

Reglas del contrato de meses:

- El backend devuelve `meses_opciones` con **todos** los meses mostrables: enero–diciembre del año del periodo y, si `fecha_fin` cae en otro año, los 12 del año siguiente. No se muestran años intermedios salvo que el periodo abarque más de dos años (caso no esperado; si ocurre, se muestran todos los años del rango).
- Si `existe = false` o `meses` viene vacío, el formulario arranca con `meses_sugeridos`.
- Un mes con `tiene_pagos = true` se muestra marcado, deshabilitado y con badge «Con pagos». El backend rechaza el `PUT` si se intenta quitar (`409 MES_CON_PAGOS`).
- Un mes con `tiene_pendientes = true` se puede quitar; el backend inactiva sus obligaciones pendientes/en mora. La UI lo advierte en el diálogo retroactivo y en la fila del mes.
- `meses` puede ir vacío en la respuesta de un backend viejo; el frontend usa `meses_sugeridos` o, en último caso, los 12 meses de `anio_lectivo`.

#### b) Tipos de pago del periodo — NUEVO

```ts
export type TipoPagoGrupo = 'MENSUALIDAD' | 'MATRICULA' | 'ADICIONAL'
export type PeriodicidadTipoPago = 'PERIODICO' | 'UNICO'

/**
 * Una regla de destino. Campos presentes = condiciones AND.
 * Varias reglas = OR. Los arreglos (`curso_ids`, `alumno_ids`) son OR internos.
 */
export interface ReglaDestinoTipoPago {
  id?: string
  modalidad_id?: string | null
  grado_id?: string | null
  seccion_id?: string | null
  curso_ids?: string[]
  alumno_ids?: string[]
}

export interface TipoPagoPeriodo {
  /** Para fijos el backend puede usar `mensualidad`/`matricula` como id estable. */
  id: string
  codigo: string
  nombre: string
  descripcion?: string | null
  /** Monto del adicional. En fijos es 0 cuando el monto es por grado. */
  monto: number
  /** true en mensualidad/matrícula: el monto real se edita por grado. */
  monto_por_grado: boolean
  grupo: TipoPagoGrupo
  es_periodico: boolean
  /** Se muestra como badge «Bloquea notas» / «No bloquea notas». Default true en backend. */
  bloquea_notas: boolean
  /** Solo periódicos: meses que cubre (los del periodo). */
  meses?: MesCobro[]
  /** Solo únicos: fecha de vencimiento. */
  fecha_vencimiento?: string | null
  reglas: ReglaDestinoTipoPago[]
  reglas_resumen?: {
    total: number
    alumnos_estimados?: number
  }
  /** Qué puede hacer la UI con este tipo. */
  editable: {
    monto: boolean
    meses: boolean
    bloquea_notas: boolean
    eliminar: boolean
  }
}

export interface TiposPeriodoResponse {
  periodo_id: string
  periodo_nombre: string
  anio_lectivo: number
  dia_pago: number
  /** Meses configurados y opciones para la edición limitada de la mensualidad. */
  meses: MesCobro[]
  meses_sugeridos: MesCobro[]
  meses_opciones: MesCobroOpcion[]
  /** Fecha por defecto para un tipo único (día de pago del periodo). */
  fecha_vencimiento_sugerida?: string
  fijos: TipoPagoPeriodo[]
  adicionales: TipoPagoPeriodo[]
}
```

`TipoPagoAdicionalInput` — **NUEVO**:

```ts
export interface TipoPagoAdicionalInput {
  nombre: string
  descripcion?: string | null
  monto: number
  es_periodico: boolean
  bloquea_notas: boolean
  /** Obligatorio si es_periodico = false. */
  fecha_vencimiento?: string | null
  /** Ninguna regla = todos. */
  reglas: ReglaDestinoTipoPago[]
}
```

#### c) Opciones de destino — NUEVO

```ts
export interface OpcionesDestinoPago {
  modalidades: { id: string; nombre: string }[]
  grados: { id: string; nombre: string; orden: number; modalidad_ids: string[] }[]
  secciones: {
    id: string
    nombre: string
    grado_id: string
    grado_nombre: string
    modalidad_id: string
    modalidad_nombre: string
  }[]
  cursos: { id: string; nombre: string; grado_ids: string[] }[]
  alumnos: {
    id: string
    codigo: string
    nombre: string
    grado_id: string
    grado: string
    seccion_id: string
    seccion: string
    modalidad_id: string
    modalidad: string
  }[]
  /** NUEVO: fecha por defecto para un tipo único. */
  fecha_vencimiento_sugerida?: string
}
```

- Las opciones se piden con permiso `pagos_config:get`; **no** se usan `/catalogos/*`.
- El backend devuelve solo modalidades/grados/secciones/cursos activos y alumnos con matrícula `ACTIVE` en el periodo.
- Si un grado tiene varias modalidades, `modalidad_ids` permite filtrar en el cliente.

#### d) Endpoints nuevos y extendidos

| Método | Ruta | Permiso | Estado | Uso |
|---|---|---|---|---|
| GET | `/pagos/configuracion/periodos` | `pagos_config:get` | EXTENDIDO | Periodos + `meses` + `tipos_resumen` |
| GET | `/pagos/configuracion/opciones?periodo_id=` | `pagos_config:get` | **NUEVO** | Opciones de destino sin `catalogos:get` |
| GET | `/pagos/configuracion/{periodo_id}` | `pagos_config:get` | EXTENDIDO | Config + meses + opciones de meses |
| PUT | `/pagos/configuracion/{periodo_id}` | `pagos_config:put` | EXTENDIDO | Guarda días, grados, reglas y `meses` |
| GET | `/pagos/configuracion/{periodo_id}/tipos` | `pagos_config:get` | **NUEVO** | `TiposPeriodoResponse` |
| POST | `/pagos/configuracion/{periodo_id}/tipos` | `pagos_config:put` | **NUEVO** | Crear adicional |
| PUT | `/pagos/configuracion/{periodo_id}/tipos/{tipo_id}` | `pagos_config:put` | **NUEVO** | Editar adicional |
| DELETE | `/pagos/configuracion/{periodo_id}/tipos/{tipo_id}` | `pagos_config:put` | **NUEVO** | Eliminar adicional (solo sin obligaciones) |
| PUT | `/pagos/configuracion/{periodo_id}/mensualidad` | `pagos_config:put` | **NUEVO** | `{ meses, bloquea_notas }` del fijo mensualidad |
| PUT | `/pagos/configuracion/{periodo_id}/matricula` | `pagos_config:put` | **NUEVO** | `{ bloquea_notas }` del fijo matrícula |
| GET | `/pagos/mensualidades` | `pagos:get` | EXTENDIDO | Devuelve obligaciones de **todos** los tipos del periodo |
| GET | `/pagos/alumnos/{code}/mensualidades` | `pagos:get` | EXTENDIDO | Agrega `obligaciones[]` con matrícula/adicionales |
| GET | `/pagos/cartera/alumnos` | `cartera:get` | EXTENDIDO | Agrega `tipos_pendientes[]` |
| GET | `/pagos/cartera/padres` | `cartera:get` | EXTENDIDO | Agrega tipos consolidados de los hijos |
| GET | `/pagos/analitica` | `analitica_pagos:get` | EXTENDIDO | Agrega `por_tipo[]` y tipos en morosos |
| GET | `/pagos/recibos` | `pagos:get` | EXTENDIDO | Agrega tipo de pago si el recibo lo tiene |
| GET | `/calificaciones/liberacion/estado` | `calificaciones:post` | EXTENDIDO | Agrega bloqueos por tipo |
| GET | `/calificaciones/liberacion/bloqueados` | `calificaciones:post` | EXTENDIDO | Agrega `bloqueos[]` por tipo |
| GET | `/portal/clases/{asig}/calificaciones` | sesión | EXTENDIDO | Agrega `bloqueos[]`/mensaje con nombre del tipo |
| GET | `/portal/resumen` | sesión | EXTENDIDO | Agrega `bloqueos[]`/mensaje con nombre del tipo |
| GET | `/portal/resultado` | sesión | EXTENDIDO | Mensaje de bloqueo con nombre del tipo |

> `POST /pagos/cobro` **no cambia**: sigue aceptando `obligacion_pago_ids` y cobrando cualquier obligación. El nombre `MensualidadesAlumno` se conserva por compatibilidad, pero el contenido se amplía.
> Los tipos compartidos (`TipoPagoGrupo`, `BloqueoNota`) se definen una sola vez en `src/services/pagos.ts` y se importan desde `pagos-tipos.ts`, `calificaciones.ts` y `portal.ts` para no duplicar el contrato.

#### e) Caja y obligaciones — EXTENDIDO

```ts
export type TipoPagoGrupo = 'MENSUALIDAD' | 'MATRICULA' | 'ADICIONAL'

/** Fila de /pagos. Reemplaza semánticamente a MensualidadFila. */
export interface ObligacionFila {
  obligacion_id: string
  alumno_codigo: string
  alumno_nombre: string
  grado: string
  seccion: string
  /** NUEVO: null en únicos sin mes. */
  anio?: number | null
  mes?: number | null
  /** Etiqueta lista para mostrar: «Agosto 2026», «Matrícula 2026», «Gira». */
  etiqueta: string
  monto: number
  /** NUEVOS */
  mora_monto?: number
  total?: number
  tipo_pago_codigo: string
  tipo_pago_nombre: string
  tipo_pago_grupo: TipoPagoGrupo
  es_periodico?: boolean
  bloquea_notas?: boolean
  fecha_vencimiento: string
  estado: EstadoMensualidad
  pago_id?: string
  fecha_pagado?: string
  monto_pagado?: number
  origen?: 'caja' | 'recibo'
  cobrador?: string
  observaciones?: string
}

/** Alias temporal para no romper imports existentes. */
export type MensualidadFila = ObligacionFila

/** Obligación en el estado de cuenta del alumno (incluye matrícula y adicionales). */
export interface ObligacionCuenta {
  obligacion_id: string
  tipo_pago_codigo: string
  tipo_pago_nombre: string
  tipo_pago_grupo: TipoPagoGrupo
  anio?: number | null
  mes?: number | null
  etiqueta: string
  monto: number
  mora_monto?: number
  total?: number
  fecha_vencimiento: string
  estado: EstadoMensualidad
  fecha_pagado?: string
  es_periodico?: boolean
  bloquea_notas?: boolean
}

export interface MensualidadesAlumno {
  // ...campos actuales
  meses: Mensualidad[]
  /** NUEVO: todas las obligaciones; si no viene, se usa `meses`. */
  obligaciones?: ObligacionCuenta[]
}
```

#### f) Cartera, analítica y recibos — EXTENDIDO

```ts
export interface CarteraTipoPendiente {
  tipo_pago_codigo: string
  tipo_pago_nombre: string
  bloquea_notas: boolean
  monto: number
  /** Etiquetas de meses o del concepto único. */
  conceptos?: string[]
}

export interface DeudaCartera {
  // ...campos actuales
  /** NUEVO: conceptos distintos a mensualidad; no redefinen el semáforo actual. */
  tipos_pendientes?: CarteraTipoPendiente[]
  monto_tipos_pendientes?: number
}

export interface AnaliticaPagos {
  // ...campos actuales
  /** NUEVO: % pagado por tipo de pago. */
  por_tipo?: GrupoPago[]
}

export interface MorosoAnalitica {
  // ...campos actuales
  /** NUEVO: nombres de tipos pendientes (además de mensualidades). */
  tipos_pendientes?: string[]
}

export interface Recibo {
  // ...campos actuales
  /** NUEVOS: si el recibo está ligado a una obligación de otro tipo. */
  tipo_pago_codigo?: string
  tipo_pago_nombre?: string
  tipo_pago_grupo?: TipoPagoGrupo
  bloquea_notas?: boolean
}
```

#### g) Liberación de notas y portal — EXTENDIDO

```ts
/** Bloqueo tal como lo decide el backend. El frontend NO lo calcula. */
export interface BloqueoNota {
  tipo_pago_codigo: string
  tipo_pago_nombre: string
  bloquea_notas: boolean
  meses: string[]
  monto?: number
  origen?: 'mensualidad' | 'adicional'
}

export interface MesPendiente {
  // ...campos actuales
  tipo_pago_codigo?: string
  tipo_pago_nombre?: string
  bloquea_notas?: boolean
}

export interface AlumnoBloqueado {
  // ...campos actuales
  bloqueos?: BloqueoNota[]
}

export interface ParcialLiberacion {
  // ...campos actuales
  bloqueos_por_tipo?: BloqueoNota[]
}

export interface NotaView {
  // ...campos actuales
  bloqueos?: BloqueoNota[]
}

export interface PortalParcialNota {
  // ...campos actuales
  bloqueos?: BloqueoNota[]
}

export interface PortalParcialResumen {
  // ...campos actuales
  bloqueos?: BloqueoNota[]
}

export interface PortalResultado {
  // ...campos actuales
  bloqueos?: BloqueoNota[]
}
```

**Regla de compatibilidad:** si `bloqueos` no viene pero `mensaje` sí, la UI muestra `mensaje` tal cual. Si ambos faltan, no inventa un bloqueo: conserva el comportamiento anterior (`bloqueado_pago` sin detalle). `bloquea_notas` ausente se trata como `true` solo para mostrar el badge de un tipo que ya existe; para tipos nuevos el formulario lo manda explícito.

---

## 5. Flujos de UI

### 5.1 Configuración de pagos: sección «Meses que se cobran»

Archivo: `src/components/pagos/ConfiguracionPagosModal.tsx`.

- Nueva sección entre «Vencimientos» y «Mensualidad, matrícula y reglas de mora»:
  - Título: «Meses que se cobran».
  - Texto de ayuda: «Son los meses en los que se generan las obligaciones periódicas del periodo. Puedes dejar más meses de los que dura el periodo.»
  - Componente `MesesCobro` (`src/components/pagos/MesesCobro.tsx`) con las opciones de `config.meses_opciones`; si no vienen, se construyen con `meses_sugeridos`/`anio_lectivo`.
  - Cada mes es una fila con checkbox, etiqueta («enero 2026»), badge de estado y, si aplica, badge «Con pagos».
  - `data-testid="pagos-config-meses"` y `data-testid={`pagos-config-mes-${anio}-${mes}`}`.
- Estado del formulario (`ConfiguracionPagosForm`):
  - `meses: MesCobro[]` (nuevo).
  - `configToForm` precarga `config.meses` o `config.meses_sugeridos`.
  - `formToPayload` incluye `meses`.
  - `validarConfiguracion` devuelve «Marca al menos un mes.» si `meses.length === 0`.
  - `dirty` incluye meses (el JSON del formulario ya lo captura).
- Meses con `tiene_pagos`:
  - Checkbox marcado y `disabled`.
  - `title`: «Este mes ya tiene pagos registrados; no se puede quitar.»
  - `data-testid` conserva el id del mes; se agrega `data-bloqueado="1"`.
- Meses con `tiene_pendientes` y desmarcados:
  - Se muestra un texto inline (`data-testid="pagos-config-mes-aviso"`): «Al quitar este mes se inactivan sus obligaciones pendientes o en mora.»
- Diálogo retroactivo (`confirmRetroactivo`):
  - Título: «¿Aplicar retroactivamente?».
  - Párrafo base actualizado si se quitaron meses:
    > «Si quitas meses, las obligaciones **pendientes o en mora** de esos meses se inactivan. Los meses con **pagos registrados** no se pueden quitar: el sistema rechaza el cambio y no se modifica nada.»
  - Si el usuario elige «Sí, retroactivo», además se recalculan montos/vencimientos de las obligaciones pendientes/en mora. Las pagadas no se tocan.
  - Botones actuales: `pagos-config-retroactivo-no` y `pagos-config-retroactivo-si`.
  - Si no cambiaron los meses, se mantiene el texto actual para no alterar el flujo existente.
- Al guardar con éxito:
  - `toast.success('Configuración de pagos guardada')`; si la respuesta trae `meses_inactivados`/`obligaciones_inactivadas`, se agrega el conteo al toast («Se inactivaron N obligaciones de los meses quitados»).
  - Invalidar `['pagos-config', periodoId]` y `['pagos-config-periodos']`.
  - Cerrar el modal como hoy.
- Errores:
  - `409 MES_CON_PAGOS`: toast con el mensaje del backend; no se cierra el modal ni se pierden cambios.
  - Error de red: `toast.error(userMessageFromError(e))`.

### 5.2 Página `/tipos-pagos`

Archivo nuevo: `src/routes/_app/tipos-pagos.tsx`.

- `RequirePermission permission="pagos_config:get"`.
- Query: `listPeriodosConfig()` (misma clave `['pagos-config-periodos']` que `/configuracion-pagos` para compartir caché).
- `DataTable` (`REG-UI-12`):
  - Título: «Tipos pagos».
  - `canAdd={false}` y sin `onAdd`/`addLabel`: **no** hay «Agregar periodo».
  - Buscador «Buscar…» automático de `DataTable`; `searchText` incluye tipos y meses.
  - Columnas:
    1. **Periodo** (`nombre`).
    2. **Año lectivo** (`anio_lectivo`).
    3. **Estado**: badge con `periodoEstadoPalabra` (`badge--warn` para `FINALIZED`, `badge--muted` para otros, sin clase extra para `ACTIVE`).
    4. **Tipos**: chips:
       - `Mensualidad` si `tipos_resumen.mensualidad`.
       - `Matrícula` si `tipos_resumen.matricula`.
       - `+N adicionales` si `tipos_resumen.adicionales > 0`, con `title` de `nombres_adicionales`.
       - Si no hay resumen: `—` (`texto-muted`).
    5. **Meses**: chips cortos de `meses` (`ene 2026`, `feb 2026`, …); si no viene: `—`. Si hay más de 6, mostrar los primeros 6 y `+N`.
  - Filtros:
    - `anio_lectivo` (label «Año»), valores desde los datos.
    - `status` (label «Estado») con `getLabel` humano.
  - `exportFilename="tipos-pagos"`.
  - `exportRows`: periodo, año, estado, tipos, meses.
  - `onRowContextMenu` abre `ctx-menu` con «Ver» (`data-testid={`tipos-pagos-ctx-ver-${id}`}`).
  - `onRowDoubleClick` abre el modal.
  - `data-testid="tipos-pagos-page"`.
- Acción por fila en escritorio:
  - Botón `btn btn--ghost btn--sm` «Ver» en columna «Acciones» (`data-testid={`tipos-pagos-btn-${id}`}`), por accesibilidad y consistencia con `/configuracion-pagos`.
  - No hay botón de agregar ni de editar desde la tabla.
- Móvil (`< 768px`):
  - `card` de `DataTable`: título = periodo; campos = año, estado, tipos, meses; `status` = estado; `testId` = `tipos-pagos-card-${id}`.
  - `rowActions`: «Ver» con `testId: tipos-pagos-row-ver-${id}`; `RowMenu` de 3 puntos.
- Sin periodos: `empty-state` «No hay periodos»; sin añadir.

### 5.3 Modal de tipos del periodo

Archivo nuevo: `src/components/pagos/TiposPagoPeriodoModal.tsx`.

- Props: `{ periodo: PeriodoConfigLista; onClose: () => void }`.
- `Modal xl`, `testId="tipos-pago-modal"`, título `Tipos de pago · <periodo.nombre>`.
- Query `['pagos-tipos', periodo.id]` con `getTiposPeriodo(periodo.id)`, `enabled` al abrir, `retry: false`.
- Cabecera de contexto:
  - Periodo, año lectivo, día de pago.
  - Meses configurados: chips (`data-testid="tipos-pago-meses"`).
  - Si no hay configuración: aviso «Este periodo aún no tiene configuración de pagos; los montos por grado se definen en Configuración de pagos.»
- Sección **«Pagos fijos»** (`data-testid="tipos-pago-fijos"`):
  - Una tarjeta/fila por `fijos` (Mensualidad y Matrícula).
  - Badges:
    - Mensualidad: `Fijo` + `Periódico` + `Bloquea notas` / `No bloquea notas`.
    - Matrícula: `Fijo` + `Único` + `Bloquea notas` / `No bloquea notas`.
  - Monto: `monto_por_grado ? 'Monto por grado' : lempiras(monto)`.
  - Texto: «El monto se edita en Configuración de pagos» con `<Link to="/configuracion-pagos">` (`data-testid="tipos-pago-ir-configuracion"`). No se edita aquí.
  - Acciones:
    - Mensualidad: «Editar meses y bloqueo» (`data-testid="tipos-pago-editar-mensualidad"`) → `TipoPagoFijoModal` con meses + `bloquea_notas`.
    - Matrícula: «Editar bloqueo» (`data-testid="tipos-pago-editar-matricula"`) → `TipoPagoFijoModal` solo `bloquea_notas`.
    - No hay «Eliminar».
  - `data-testid="tipos-pago-fijo-mensualidad"` / `tipos-pago-fijo-matricula`.
- Sección **«Tipos adicionales»** (`data-testid="tipos-pago-adicionales"`):
  - Botón «Agregar tipo» (`data-testid="tipos-pago-agregar"`), solo con `pagos_config:put`.
  - Si vacío: `empty-state` «Aún no hay tipos adicionales.»
  - Cada adicional (`data-testid={`tipos-pago-item-${id}`}`):
    - Nombre + descripción (si hay).
    - Monto en L.
    - Badge `Periódico`/`Único`.
    - `BloqueaNotasBadge`.
    - Resumen de destinos: «Todos los alumnos» o lista de reglas (`reglaDestinoLabel`), y `N reglas`/`~M alumnos` si viene.
    - Meses (periódico) o fecha de vencimiento (único).
    - Acciones «Editar» (`tipos-pago-editar-${id}`) y «Eliminar» (`tipos-pago-eliminar-${id}`), solo con `pagos_config:put`.
  - Eliminar abre `ConfirmDialog danger`:
    - Título «Eliminar tipo de pago».
    - Mensaje: «¿Eliminar «<nombre>»? Solo se puede eliminar si no tiene obligaciones generadas.»
    - `testId="tipos-pago-confirmar-eliminar"`.
    - Al confirmar: `deleteTipoPagoPeriodo`; success toast «Tipo de pago eliminado»; error 409 con mensaje del backend.
- Footer: «Cerrar».
- Mientras carga: «Cargando tipos de pago…».
- Error de carga: mensaje + «Reintentar».
- Al crear/editar/eliminar: `invalidateQueries` (ver §7) y refrescar la query del modal; el modal permanece abierto.
- `data-testid="tipos-pago-modal"`.

### 5.4 Formulario de tipo adicional

Archivo nuevo: `src/components/pagos/TipoPagoAdicionalModal.tsx`.

- Props: `{ periodo: PeriodoConfigLista; tipo?: TipoPagoPeriodo | null; onClose: () => void }`.
- `Modal xl`, título `Nuevo tipo de pago` / `Editar tipo de pago`.
- Estructura por secciones (`expediente`, `expediente__seccion`, `expediente__titulo`):
  1. **Datos**
     - `Field` Nombre (`data-testid="tipo-pago-nombre"`), requerido.
     - `Field` Descripción (`tipo-pago-descripcion`), textarea.
     - `Field` Monto (L) (`tipo-pago-monto`), `type="number" min={0} step="0.01"`.
     - **Periodicidad** con `.segmento` (`role="radiogroup"`):
       - `Periódico` (`tipo-pago-periodico`) — valor `PERIODICO`, por defecto.
       - `Único` (`tipo-pago-unico`) — valor `UNICO`.
     - Si `PERIODICO`:
       - Texto de solo lectura: «Meses: <meses configurados>» (`tipo-pago-meses-periodico`).
       - Si no hay meses configurados: error «Configura los meses del periodo antes de crear un tipo periódico.» y guardar deshabilitado.
       - No se vuelve a pedir el selector de meses aquí: usa los del periodo.
     - Si `UNICO`:
       - `Field` Fecha de vencimiento (`tipo-pago-fecha-vencimiento`), `type="date"`, valor inicial `fecha_vencimiento_sugerida` (o `fechaVencimientoSugerida` del helper si el backend no la manda).
       - Requerida.
  2. **Bloqueo de notas**
     - Checkbox/toggle «Bloquea notas» (`tipo-pago-bloquea-notas`), **activo por defecto** en creación.
     - Texto de ayuda: «Si está activo, una obligación pendiente de este tipo impide ver las calificaciones de los meses que cubre. El backend decide el bloqueo; aquí solo se configura.»
     - Usar `label` con clase existente `.nivel-fila__check` o `.coord-check`; no se crea estilo nuevo.
  3. **Destinos**
     - Componente `DestinosTipoPago` (ver §5.4.1).
     - Título: «¿A quién se cobra?».
     - Ayuda: «Sin reglas se cobra a todos los alumnos del periodo. Varias reglas se suman (OR). Dentro de una regla, los campos se cumplen juntos (AND).»
- Validaciones (`validarTipoAdicional`):
  - Nombre no vacío.
  - Monto numérico ≥ 0.
  - Periódico: debe haber meses en la configuración del periodo.
  - Único: fecha de vencimiento no vacía.
  - Reglas: si una regla viene vacía (sin ningún campo), se descarta al guardar; no bloquea.
- Guardar:
  - `ConfirmDialog` «Guardar tipo de pago» con resumen nombre + periodicidad + monto.
  - `createTipoPagoPeriodo` / `updateTipoPagoPeriodo`.
  - Success toast «Tipo de pago creado/actualizado»; cierra solo este modal y refresca el modal de tipos.
- Error inline (`tipo-pago-error`) con `userMessageFromError`.
- `data-testid="tipo-pago-form"`, `tipo-pago-guardar`, `tipo-pago-confirmar`.

#### 5.4.1 `DestinosTipoPago`

Archivo nuevo: `src/components/pagos/DestinosTipoPago.tsx`.

- Props: `{ value: ReglaDestinoTipoPago[]; onChange: (r: ReglaDestinoTipoPago[]) => void; opciones: OpcionesDestinoPago; disabled?: boolean }`.
- Tabs con `.segmento` exactamente como `CoordinacionWizard` / `TipoFichaModal`:
  - `Modalidad` (`tipo-pago-tab-modalidad`).
  - `Grado` (`tipo-pago-tab-grado`).
  - `Sección` (`tipo-pago-tab-seccion`).
  - `Avanzado` (`tipo-pago-tab-avanzado`).
- Layout de dos columnas como `.coord-alcance` (si existe la clase) o `div` con grid inline existente: izquierda lista, derecha `aside.coord-resumen`.
- **Modalidad:** `.coord-lista` + `.coord-check`; cada modalidad agrega `{ modalidad_id }`.
- **Grado:** `.coord-arbol` o `.coord-lista`; cada grado agrega `{ grado_id }`.
- **Sección:** `.coord-arbol` con cabecera de grado y `.coord-lista--hijo` con secciones; cada sección agrega `{ seccion_id }`.
- **Avanzado:** `.coord-arbol` + `.coord-abrir`:
  - Grado expandible.
  - «Cursos en todo el grado»: cada curso agrega `{ grado_id, curso_ids: [curso.id] }`.
  - Secciones expandibles; dentro:
    - Cursos de la sección: `{ seccion_id, curso_ids: [curso.id] }`.
    - Alumnos de la sección: `{ seccion_id, alumno_ids: [alumno.id] }`.
  - `SearchInput` con placeholder «Buscar…» para filtrar cursos/alumnos dentro de avanzado.
  - Si un alumno o curso ya está cubierto por una regla más amplia, se muestra con `coord-check--incluida` y deshabilitado (mismo patrón que `CoordinacionWizard`), para no duplicar.
- **Resumen (`aside.coord-resumen`)**:
  - Título «Resumen».
  - Si `value.length === 0`: «Todos los alumnos del periodo.»
  - Si hay reglas: `N regla(s)`, lista con `reglaDestinoLabel(regla, opciones)` y botón X para quitar.
  - Si el backend devuelve `reglas_resumen.alumnos_estimados`, mostrar «~M alumnos»; si no, no inventar el número.
- Normalización:
  - Duplicados exactos se eliminan (`claveRegla`).
  - Reglas que incluyen a otras se pueden mostrar como «incluida» y no se agregan dos veces.
  - Al cambiar modalidad/grado/sección, se limpian reglas incompatibles si el usuario las quita manualmente; no se borran solas sin acción.
- `data-testid` por opción: `tipo-pago-destino-modalidad-${id}`, `tipo-pago-destino-grado-${id}`, `tipo-pago-destino-seccion-${id}`, `tipo-pago-destino-curso-${id}`, `tipo-pago-destino-alumno-${codigo}`.
- `data-testid="tipo-pago-resumen"`.

### 5.5 Edición limitada de fijos

Archivo nuevo: `src/components/pagos/TipoPagoFijoModal.tsx`.

- Props: `{ periodo: PeriodoConfigLista; tipo: TipoPagoPeriodo; onClose: () => void }`.
- Mensualidad:
  - `MesesCobro` con `meses_opciones` (las mismas de la configuración).
  - Toggle «Bloquea notas».
  - Guardar con `updateMensualidadPeriodo(periodo.id, { meses, bloquea_notas })`.
- Matrícula:
  - Sin meses.
  - Toggle «Bloquea notas».
  - Texto: «La matrícula es un pago único. Su monto por grado se edita en Configuración de pagos.»
  - Guardar con `updateMatriculaPeriodo(periodo.id, { bloquea_notas })`.
- Validación de al menos un mes en mensualidad.
- Success toast y refresco de `['pagos-tipos', periodo.id]`, `['pagos-config', periodo.id]` y `['pagos-config-periodos']`.

### 5.6 Caja `/pagos`

Archivo: `src/routes/_app/pagos.tsx`.

- La tabla deja de ser solo mensualidades; `listMensualidades()` devuelve `ObligacionFila[]` de todos los tipos del periodo.
- Columnas:
  - Alumno + código (igual).
  - Grado · sección (igual).
  - **Tipo** (nueva): badge o texto con `tipo_pago_nombre`; `data-testid="pago-tipo-<obligacion_id>"`.
  - **Concepto**: para mensualidad `mesAnio(anio, mes)`; para matrícula/adicional `etiqueta`; para único sin mes, la etiqueta. Mantener la columna «Mes» con `id: 'mes'` para no romper filtros existentes, pero su `getValue` usa `etiqueta` cuando no hay mes.
  - Monto: `total ?? monto` (incluye mora si el backend lo manda).
  - Vence, Estado, Pagado el (igual).
- Filtros:
  - Estado, Mes, Grado, Sección (existentes).
  - **Tipo** (nuevo): `id: 'tipo_pago'`, `getValue: r => r.tipo_pago_codigo`, `getLabel: r => r.tipo_pago_nombre`.
  - El filtro «Mes» incluye `Sin mes` para únicos, con `options` derivadas.
- `searchText` incluye alumno, código, grado, sección, tipo y etiqueta.
- `exportRows` agrega `tipo` y `concepto`.
- Context menu:
  - **Ver** (todos).
  - **Editar** solo para `tipo_pago_grupo === 'MENSUALIDAD'` (el modal actual está pensado para mensualidad). Para otros, el modal de Ver es suficiente en esta versión.
  - **Anular pago** solo para `tipo_pago_grupo === 'MENSUALIDAD'` y `estado === 'pagado'` (el endpoint actual solo anula mensualidades).
  - **Registrar pago** para cualquier obligación no pagada, con `setRegistrar({ code: row.alumno_codigo })`.
- `RegistrarPagoModal`:
  - Sigue cargando `getMensualidadesAlumno(code)`.
  - `const obligaciones = c.obligaciones ?? c.meses` (fallback).
  - `const mensuales = obligaciones.filter(o => o.tipo_pago_grupo === 'MENSUALIDAD')`.
  - `const otros = obligaciones.filter(o => o.tipo_pago_grupo !== 'MENSUALIDAD')`.
  - La sección actual `.cobro-meses` sigue mostrando **solo mensualidades**, con los mismos `data-testid="pago-mes-<anio>-<mes>"` para no romper `pagos.spec.ts` / `liberacion.spec.ts`.
  - Nueva sección «Matrícula y otros conceptos» (`data-testid="pago-otros-conceptos"`) solo si `otros.length > 0`:
    - Misma fila visual `.cobro-meses__item`.
    - Checkbox, etiqueta (`Matrícula 2026`, `Cuota de laboratorio · septiembre`), badge de estado, monto y fecha de vencimiento.
    - `data-testid={`pago-obligacion-${id}`}`.
  - La selección usa `obligacionesSel` (renombrar `mesesSel`, manteniendo el flujo); total = suma de `total ?? monto` de seleccionadas.
  - Botón: «Cobrar N concepto(s) · L total».
  - `ConfirmDialog`: «¿Registrar el pago de <conceptos> (L total) para <alumno>?».
  - `cobrarObligaciones(code, ids, observaciones)` (alias de `cobrarMeses`) para no cambiar el endpoint.
  - `Toca pagar` sigue calculándose con el primer mes mensual pendiente; si no hay, muestra «Al día en mensualidades» y los otros conceptos aparte.
  - `refrescarPagos` agrega invalidaciones (§7).
- `DatosMensualidad` (Ver/Editar/Anular):
  - Agrega «Tipo» y «Concepto».
  - Anular mantiene el texto de mensualidad y solo se ofrece para mensualidades.
- No se cambia el endpoint de cobro ni el flujo de `?alumno=<código>`.

### 5.7 Cartera, analítica y recibos

- **`/alumnos` y `/padres`**:
  - Nueva columna «Conceptos» con `ConceptosPendientes` (`src/components/pagos/ConceptosPendientes.tsx`).
  - Renderiza `tipos_pendientes` como chips `Nombre · L monto`; si no hay, «—».
  - `title` con `conceptos` (meses) si viene.
  - El estado de pago (`EstadoPago`) y `monto_vencido` **siguen basados en mensualidades** para no cambiar el semáforo aprobado; los tipos adicionales se muestran aparte.
  - `exportRows` agrega `conceptos`.
- **`/analitica-pagos`**:
  - Nueva tarjeta «Por tipo de pago» (`data-testid="analitica-pagos-por-tipo"`), solo si `por_tipo?.length`.
  - Reutiliza `BarrasGrado` con una prop opcional `unidad` («pagos») o se crea `BarrasTipoPago` en `Graficas.tsx` con el mismo patrón y tokens; sin estilos nuevos.
  - Tabla de morosos agrega columna «Tipos» si `tipos_pendientes` viene, con los nombres.
  - Exportación (`helpers/export-analitica-pagos.ts`) agrega una hoja/sección «Por tipo» cuando `por_tipo` exista; si no, se omite.
- **`/recibos`**:
  - Si algún recibo trae `tipo_pago_nombre`, se agrega columna «Tipo» y filtro por tipo; si no, la tabla queda igual.
  - El formulario de validación muestra el tipo en modo lectura. No se cambia el body de `PUT /pagos/recibos/{id}/validar`.

### 5.8 Liberación de notas y portal

- **`/liberacion-notas`**:
  - `AlumnoBloqueado` usa `bloqueos` si viene; si no, sigue usando `meses`.
  - Columna «Pagos pendientes» muestra `Tipo · concepto` (por ejemplo `Cuota de laboratorio · septiembre`).
  - `DetallePagos` lista cada obligación con badge del tipo y, si `bloquea_notas`, badge «Bloquea notas».
  - Si `bloqueos` viene, se muestra un bloque `data-testid="liberacion-bloqueos"` con el nombre del tipo y los meses; si no, no se inventa.
  - El modal «Liberar calificaciones» agrega un párrafo: «Si un tipo adicional está marcado como “Bloquea notas”, también impide ver el parcial aunque la mensualidad esté pagada.»
  - `ParcialCard` puede mostrar `bloqueos_por_tipo` si el backend lo manda.
- **Portal (`PortalCalificacionesView`, `alumno/resultados.tsx`, `hijo/...`)**:
  - Ya muestra `p.mensaje`; el backend debe incluir el nombre del tipo en ese mensaje.
  - Si viene `bloqueos`, se agregan chips/una línea con `tipo_pago_nombre` y meses (`data-testid="portal-calif-bloqueo-tipo"`).
  - El frontend **no** decide si bloquea ni qué tipo bloquea; solo pinta lo que recibe.

### 5.8.1 Portal del padre — pagos (`/hijo/pagos`)

El padre debe ver **todo lo que tiene que pagar** en la misma pantalla donde sube comprobantes, no solo mensualidades.

- **Listado:** `/hijo/pagos` consume `GET /portal/pagos` y muestra una lista/tarjetas por obligación:
  - Tipo (`Mensualidad`, `Matrícula`, nombre del adicional).
  - Concepto/`periodo_label` y, si aplica, mes/año.
  - Monto, mora, total, vencimiento, estado (`pendiente`/`pagado`/`mora`) y badge `Bloquea notas` si `bloquea_notas`.
  - Para mensualidades se mantiene la agrupación por mes; matrícula/adicionales van en una sección «Otros pagos» o en la misma lista con chip de tipo.
  - El total pendiente y el «próximo pago» incluyen todos los tipos.
- **Subir comprobante:** cada obligación impaga tiene «Subir comprobante». El modal envía `obligacion_pago_id` (y mantiene `{anio, mes}` solo como fallback para mensualidades). El comprobante se sube igual que hoy; caja lo valida en `/recibos`.
- **Bloqueo:** si una obligación es `bloquea_notas`, el padre ve el badge y el mensaje del backend en la pantalla de calificaciones. La UI no calcula el bloqueo.
- **Estados:** si el recibo está `sin_revisar`, se muestra «En revisión» y no se permite duplicar; si está `aprobado`, la obligación pasa a pagada; si está `denegado`, vuelve a permitir subir.
- **Compatibilidad:** si el backend no manda `obligaciones[]`, la pantalla sigue usando `meses[]` como hoy.
- **Tests:** portal lista matrícula/adicional; sube comprobante por obligación; caja lo aprueba; el bloqueo de notas desaparece al pagar y reaparece al anular/revertir.

### 5.9 Responsive

- `/tipos-pagos`: tabla en escritorio; cards + `RowMenu` en `< 768px` con las mismas acciones.
- Modal de tipos y formulario: `Modal xl`; en móvil el contenido se apila; el árbol de destinos hace scroll vertical dentro del modal; el resumen pasa debajo.
- `MesesCobro`: una columna en móvil; el grid de meses no desborda.
- Caja: se conserva el comportamiento actual; los nuevos conceptos usan la misma fila `.cobro-meses`.
- Sin degradados; solo tokens y clases existentes.

---

## 6. Archivos a crear y modificar

### Crear

| Ruta | Contenido |
|---|---|
| `src/routes/_app/tipos-pagos.tsx` | Página de periodos con tipos; tabla, filtros, exportación, modal y menú móvil |
| `src/components/pagos/TiposPagoPeriodoModal.tsx` | Modal con fijos + adicionales, CRUD y eliminación |
| `src/components/pagos/TipoPagoAdicionalModal.tsx` | Formulario de tipo adicional (datos, periodicidad, bloqueo, destinos) |
| `src/components/pagos/TipoPagoFijoModal.tsx` | Edición limitada de mensualidad/matrícula |
| `src/components/pagos/MesesCobro.tsx` | Selector de meses reutilizable (configuración y fijo mensualidad) |
| `src/components/pagos/DestinosTipoPago.tsx` | Tabs Modalidad/Grado/Sección/Avanzado + resumen de reglas |
| `src/components/pagos/BloqueaNotasBadge.tsx` | Badge «Bloquea notas» / «No bloquea notas» |
| `src/components/pagos/ConceptosPendientes.tsx` | Chips de tipos pendientes para cartera |
| `src/components/portal/PagoObligacionCard.tsx` | Tarjeta/fila de obligación del portal del padre con tipo, monto, mora, total, vencimiento, estado, badge de bloqueo y «Subir comprobante» |
| `src/helpers/tipos-pago.ts` | `etiquetaTipoPago`, `reglaDestinoLabel`, `claveRegla`, `normalizarReglas`, `periodicidadLabel`, `validarTipoAdicional`, `reglasToPayload` |
| `src/services/pagos-tipos.ts` | Endpoints de tipos, opciones y edición de fijos |
| `src/tests/e2e/tipos-pagos.spec.ts` | E2E de la feature |
| `src/tests/e2e/portal-pagos.spec.ts` | E2E del listado del portal y comprobante de matrícula/adicional |

### Modificar

| Ruta | Cambio |
|---|---|
| `src/components/pagos/ConfiguracionPagosModal.tsx` | Sección «Meses que se cobran», validación, payload y diálogo retroactivo |
| `src/helpers/configuracion-pagos.ts` | `meses` en el form, `configToForm`/`formToPayload`, validación y helpers de meses (`mesesDisponibles`, `mesesSugeridos`, `mesCobroLabel`) |
| `src/services/pagos-config.ts` | `MesCobro`, `MesCobroOpcion`, campos nuevos de periodo/config y `meses` en el update |
| `src/routes/_app/pagos.tsx` | Columna/filtro Tipo, conceptos en el modal, total, acciones por tipo |
| `src/services/pagos.ts` | `ObligacionFila`, `ObligacionCuenta`, `CarteraTipoPendiente`, `BloqueoNota`, `por_tipo`, campos de recibo y alias de cobro |
| `src/routes/_app/recibos.tsx` | Columna/filtro Tipo si el backend lo devuelve |
| `src/routes/_app/alumnos.tsx` | Columna «Conceptos» |
| `src/routes/_app/padres.tsx` | Columna «Conceptos» |
| `src/routes/_app/analitica-pagos.tsx` | Tarjeta «Por tipo de pago» y tipos en morosos |
| `src/components/analitica-pagos/Graficas.tsx` | `BarrasTipoPago` o prop `unidad` en `BarrasGrado` |
| `src/helpers/export-analitica-pagos.ts` | Hoja/sección «Por tipo» si `por_tipo` existe |
| `src/routes/_app/liberacion-notas.tsx` | Tipos/motivos de bloqueo en tabla y detalle; texto del modal |
| `src/services/calificaciones.ts` | `BloqueoNota`, `bloqueos` en `AlumnoBloqueado`/`ParcialLiberacion`/`NotaView`, `tipo_pago_*` en `MesPendiente` |
| `src/services/portal.ts` | `bloqueos` en parciales/resumen/resultado; `obligaciones[]` y campos de tipo en pagos |
| `src/routes/_app/hijo/pagos.tsx` | Listado de todas las obligaciones (mensualidad, matrícula, adicionales), badge de bloqueo y subida de comprobante por `obligacion_pago_id` |
| `src/components/portal/PagoObligacionCard.tsx` | Tarjeta/fila de obligación con tipo, monto, mora, vencimiento, estado y acción de comprobante |
| `src/components/portal/PortalCalificacionesView.tsx` | Chips de bloqueo si `bloqueos` viene; mantiene `mensaje` |
| `src/routes/_app/alumno/resultados.tsx` | Chips/mensaje de bloqueo por tipo si `bloqueos` viene |
| `src/helpers/nav.ts` | Ítem «Tipos pagos» con `pagos_config:get` |
| `src/helpers/command-palette.ts` | Descripción y palabras clave de `/tipos-pagos` |
| `src/routeTree.gen.ts` | **Auto-generado** al correr dev/build; no editar a mano |
| `src/styles/style1.css` | **No se prevé tocar**: la UI reutiliza `.cobro-meses`, `.avanzado`, `.coord-*`, `.segmento`, `.badge`, `.expediente`. Si falta un modificador mínimo, solo tokens y sin degradados |

> `style2.css` hereda de `style1.css`; no se toca.
> No se modifica `src/components/ui/DataTable.tsx`, `Modal.tsx`, `Field.tsx`, `ConfirmDialog.tsx`, `Combobox.tsx` ni `RowMenu.tsx`: se usan tal cual.

---

## 7. Estado y consultas (TanStack Query)

| Query key | Dónde | Cuándo |
|---|---|---|
| `['pagos-config-periodos']` | `/configuracion-pagos`, `/tipos-pagos` | Listado compartido; se invalida al guardar config o tipos |
| `['pagos-config', periodoId]` | `ConfiguracionPagosModal`, `TipoPagoFijoModal` | Config completa con meses |
| `['pagos-tipos', periodoId]` | `TiposPagoPeriodoModal` | Fijos + adicionales |
| `['pagos-tipos-opciones', periodoId]` | `TipoPagoAdicionalModal` | Opciones de destino; `enabled` al abrir |
| `['mensualidades']` | `/pagos` | Lista de obligaciones de caja |
| `['mensualidades-alumno', code]` | `RegistrarPagoModal` | Estado de cuenta ampliado |
| `['mora']` | caja | Se invalida al cobrar |
| `['recibos']` | `/recibos` | Se invalida al cobrar/validar |
| `['liberacion-estado']` | `/liberacion-notas` | Parciales |
| `['liberacion-bloqueados']` | `/liberacion-notas` | Alumnos bloqueados |
| `['cartera-alumnos']` | `/alumnos` | Tipos pendientes |
| `['cartera-padres']` | `/padres` | Tipos pendientes |
| `['analitica-pagos']` | `/analitica-pagos` | Por tipo |
| `['portal-calificaciones']` | portal | Parciales y bloqueos |
| `['portal-resumen']` | portal | Resumen y bloqueos |
| `['resultado-periodo']` | portal | Resultado y bloqueos |

**Invalidaciones**

Guardar configuración de meses (`PUT /pagos/configuracion/{id}`):

```ts
qc.invalidateQueries({ queryKey: ['pagos-config', periodoId] })
qc.invalidateQueries({ queryKey: ['pagos-config-periodos'] })
qc.invalidateQueries({ queryKey: ['pagos-tipos', periodoId] })
qc.invalidateQueries({ queryKey: ['mensualidades'] })
qc.invalidateQueries({ queryKey: ['mensualidades-alumno'] })
qc.invalidateQueries({ queryKey: ['mora'] })
qc.invalidateQueries({ queryKey: ['liberacion-bloqueados'] })
qc.invalidateQueries({ queryKey: ['liberacion-estado'] })
qc.invalidateQueries({ queryKey: ['cartera-alumnos'] })
qc.invalidateQueries({ queryKey: ['cartera-padres'] })
qc.invalidateQueries({ queryKey: ['analitica-pagos'] })
```

Crear/editar/eliminar tipo adicional, o editar fijo:

```ts
qc.invalidateQueries({ queryKey: ['pagos-tipos', periodoId] })
qc.invalidateQueries({ queryKey: ['pagos-config-periodos'] })
qc.invalidateQueries({ queryKey: ['pagos-config', periodoId] })
qc.invalidateQueries({ queryKey: ['mensualidades'] })
qc.invalidateQueries({ queryKey: ['mensualidades-alumno'] })
qc.invalidateQueries({ queryKey: ['mora'] })
qc.invalidateQueries({ queryKey: ['recibos'] })
qc.invalidateQueries({ queryKey: ['liberacion-bloqueados'] })
qc.invalidateQueries({ queryKey: ['liberacion-estado'] })
qc.invalidateQueries({ queryKey: ['cartera-alumnos'] })
qc.invalidateQueries({ queryKey: ['cartera-padres'] })
qc.invalidateQueries({ queryKey: ['analitica-pagos'] })
qc.invalidateQueries({ queryKey: ['portal-pagos'] })
qc.invalidateQueries({ queryKey: ['portal-calificaciones'] })
qc.invalidateQueries({ queryKey: ['portal-resumen'] })
qc.invalidateQueries({ queryKey: ['resultado-periodo'] })
```

Cobrar (caja):

```ts
// refrescarPagos actual + ampliación
qc.invalidateQueries({ queryKey: ['mensualidades'] })
qc.invalidateQueries({ queryKey: ['mensualidades-alumno'] })
qc.invalidateQueries({ queryKey: ['mora'] })
qc.invalidateQueries({ queryKey: ['recibos'] })
qc.invalidateQueries({ queryKey: ['liberacion-bloqueados'] })
qc.invalidateQueries({ queryKey: ['liberacion-estado'] })
qc.invalidateQueries({ queryKey: ['cartera-alumnos'] })
qc.invalidateQueries({ queryKey: ['cartera-padres'] })
qc.invalidateQueries({ queryKey: ['analitica-pagos'] })
qc.invalidateQueries({ queryKey: ['portal-pagos'] })
qc.invalidateQueries({ queryKey: ['portal-calificaciones'] })
qc.invalidateQueries({ queryKey: ['portal-resumen'] })
qc.invalidateQueries({ queryKey: ['resultado-periodo'] })
```

**Buenas prácticas**

- `enabled: can('pagos_config:get')` en las queries de la página/modal.
- `retry: false` en `getTiposPeriodo` y `getOpcionesDestinoPago` mientras el backend 016 no exista; la página debe mostrar un estado vacío, no romperse.
- `staleTime` corto (15–30 s) en `['pagos-tipos', periodoId]` y `['pagos-config-periodos']` para ver cambios entre pestañas.
- No duplicar claves: `/configuracion-pagos` y `/tipos-pagos` comparten `['pagos-config-periodos']`.

---

## 8. Permisos y roles

| Acción | Frontend | Backend |
|---|---|---|
| Ver `/tipos-pagos` | `pagos_config:get` (`RequirePermission`) | valida permiso |
| Abrir modal de tipos | `pagos_config:get` | valida permiso |
| Crear/editar/eliminar adicional | `pagos_config:put` (`Can`) | valida permiso y reglas |
| Editar meses/bloqueo de fijos | `pagos_config:put` (`Can`) | valida permiso |
| Ver opciones de destino | `pagos_config:get` | valida permiso; **no** exige `catalogos:get` |
| Caja: ver tipos | `pagos:get` | valida permiso |
| Caja: cobrar | `pagos:post` | valida permiso |
| Caja: editar/anular mensualidad | `pagos:put` | valida permiso y que sea mensualidad |
| Liberación de notas | `calificaciones:post` | valida permiso |
| Portal | sesión del alumno/responsable | valida pertenencia |

- **No se agrega permiso nuevo.** `ROLE_PERMISSIONS` no se toca.
- `contabilidad`, `admin` y `admin_temporal` ya tienen `pagos_config:get|put`; son los únicos que ven el ítem de menú y las acciones de escritura.
- `Can`/`useCan` solo ocultan botones; el backend es la autoridad final.
- `nav.ts`: nuevo ítem

```ts
{
  to: '/tipos-pagos',
  label: 'Tipos pagos',
  permission: 'pagos_config:get',
  icon: 'receipt',
}
```

- `command-palette.ts`: agregar descripción «Conceptos de cobro por periodo» y palabras clave `['tipo', 'tipos', 'pago', 'pagos', 'mensualidad', 'matricula', 'concepto', 'cobro']`. No se agrega comando «Agregar» porque la página no crea periodos.

---

## 9. Bloqueo de notas

### 9.1 Modelo

- Cada tipo de pago tiene `bloquea_notas: boolean`.
- El **backend** decide si una obligación pendiente/en mora de ese tipo bloquea la visualización de un parcial. El frontend **solo**:
  1. configura el flag;
  2. muestra el badge;
  3. muestra el `mensaje`/`bloqueos` que devuelve el backend.
- El frontend **nunca** recalcula meses, mora ni bloqueos a partir de obligaciones. Si el backend no manda `bloqueos`, se usa `mensaje`; si tampoco hay mensaje, se mantiene el estado `bloqueado_pago` sin detalle inventado.

### 9.2 Ejemplo aprobado: agosto y septiembre

Supongamos un periodo con meses de cobro **agosto** y **septiembre**, un III parcial que abarca ambos meses y un tipo adicional **«Cuota de laboratorio»** con `es_periodico = true`, `bloquea_notas = true` y destino «7.º A». La mensualidad de agosto y septiembre está pagada.

- **Caso A — laboratorio de septiembre pendiente:**
  - Caja muestra `Cuota de laboratorio · septiembre · Pendiente · L 500`.
  - La tabla de liberación muestra al alumno con `Parcial III · Cuota de laboratorio (septiembre) · Pendiente`.
  - El portal del padre/alumno muestra el mensaje del backend: «Las calificaciones del III parcial se habilitarán cuando se pague la Cuota de laboratorio de septiembre.»
  - La UI **no** dice que el bloqueo es por mensualidad.
- **Caso B — laboratorio de agosto y septiembre pendientes:**
  - La UI lista ambos meses y el monto total pendiente del tipo.
- **Caso C — mensualidad y laboratorio pendientes:**
  - La UI muestra ambos tipos con sus meses; el backend decide el mensaje final. El frontend no elige uno.
- **Caso D — laboratorio pagado, mensualidad pendiente:**
  - El bloqueo restante es de mensualidad; el mensaje debe nombrar la mensualidad, no el laboratorio.
- **Caso E — tipo con `bloquea_notas = false` (por ejemplo «Uniforme»):**
  - Aparece en caja/cartera como obligación pendiente, pero **no** aparece en `bloqueos` ni impide ver notas.
- **Caso F — tipo único con fecha de vencimiento:**
  - Si su fecha cae dentro del parcial y está pendiente con `bloquea_notas = true`, el backend lo incluye con su etiqueta (`Gira · 15 sep 2026`). La UI solo lo muestra.

### 9.3 Dónde se ve

| Lugar | Qué muestra |
|---|---|
| `/tipos-pagos` → modal | Badge `Bloquea notas` / `No bloquea notas` en fijos y adicionales |
| `TipoPagoAdicionalModal` | Toggle «Bloquea notas» activo por defecto |
| `TipoPagoFijoModal` | Toggle para mensualidad/matrícula |
| `/pagos` | Columna/filtro Tipo; búsqueda por tipo; no muestra el bloqueo como lógica |
| `/alumnos`, `/padres` | Chips de conceptos pendientes; los que bloquean llevan `title`/badge |
| `/liberacion-notas` | Tipo + meses + badge «Bloquea notas»; detalle y modal |
| Portal | `mensaje` del backend y, si viene, chips de `bloqueos` |

### 9.4 Regla de mensaje

- El backend debe redactar el mensaje final; el frontend no concatena nombres de tipos salvo para un chip visual.
- Si el backend solo devuelve `bloqueos` y no `mensaje`, el frontend puede mostrar un texto **genérico** con el nombre del tipo: «Parcial pendiente por <tipo_pago_nombre> de <meses>.» Esto es solo presentación, no lógica de bloqueo.
- Si el backend devuelve `bloquea_notas = false`, el frontend no debe pintarlo como bloqueo aunque la obligación esté pendiente.

---

## 10. Manejo de errores y casos borde

- **Sin periodos:** `/tipos-pagos` muestra `empty-state` «No hay periodos»; no hay «Agregar».
- **Periodo sin configuración:** el modal de tipos muestra fijos con el aviso de que los montos se editan en Configuración de pagos; los adicionales pueden crearse, pero los periódicos exigen meses configurados.
- **Sin meses seleccionados:** error inline «Marca al menos un mes.» y Guardar deshabilitado.
- **Periodo cruza año:** se muestran 12 meses del año inicial y 12 del siguiente; las etiquetas incluyen el año. Si el backend no manda opciones, se construyen con `fecha_inicio`/`fecha_fin` o `anio_lectivo`.
- **Mes con pagos:** checkbox bloqueado, badge «Con pagos», `title` explicativo. Si el backend devuelve 409 `MES_CON_PAGOS`, toast y no se cierra el modal.
- **Mes con pendientes que se desmarca:** aviso inline y párrafo en el diálogo retroactivo; el backend inactiva las obligaciones pendientes/en mora. No se borran pagos.
- **Retroactivo falla:** el modal permanece abierto, se conserva el formulario y se muestra `userMessageFromError`.
- **Dos usuarios guardan a la vez:** el backend gana; al recargar se ve el estado real. Invalidar cache tras error de conflicto.
- **Tipo adicional duplicado:** backend 400/409; error inline/toast con el mensaje. No se inventa un nombre único en el frontend.
- **Monto negativo o vacío:** validación `≥ 0`; vacío se interpreta como 0 solo si el backend lo permite, pero la UI lo marca como error si no es numérico.
- **Tipo periódico sin meses configurados:** formulario bloqueado con mensaje; no se puede guardar.
- **Tipo único sin fecha:** error inline; no se puede guardar.
- **Fecha de vencimiento anterior a hoy:** la UI no la corrige por su cuenta; el backend valida y devuelve el mensaje. Si el backend la acepta para un cobro histórico, se muestra tal cual.
- **Eliminar tipo adicional con obligaciones:** backend 409; `ConfirmDialog` ya advirtió «Solo se puede eliminar si no tiene obligaciones generadas». El tipo no desaparece de la lista.
- **Editar tipo con obligaciones generadas:** el backend decide si recalcula pendientes o rechaza; la UI muestra el error/aviso. No se reescriben pagos desde el frontend.
- **Reglas vacías:** se descartan al guardar; si todas quedan vacías, el tipo aplica a todos (equivale a sin reglas).
- **Reglas solapadas:** el backend usa OR y deduplica alumnos; la UI evita duplicados exactos y marca lo ya incluido como «incluida».
- **Modalidad/grado/sección sin opciones:** `empty-state` dentro de la pestaña «No hay opciones para este periodo».
- **Alumno sin matrícula activa:** no aparece en opciones ni genera obligación; el backend lo omite.
- **Contabilidad sin `catalogos:get`:** nunca se llama a `/catalogos/*`; si el endpoint de opciones falla, el formulario muestra el error y no cae a catálogos.
- **Backend 016 no desplegado:** `getTiposPeriodo` 404 → modal con estado vacío y aviso «La administración de tipos aún no está disponible»; `/pagos` y `/configuracion-pagos` siguen funcionando con los campos actuales. No se rompen los e2e existentes.
- **`bloquea_notas` ausente:** badge por defecto «Bloquea notas» solo en tipos existentes; no se inventa bloqueo en liberación.
- **Caja con matrícula/adicionales:** el flujo de anulación/edición solo se ofrece para mensualidades; para otros, «Ver» y «Registrar pago». Se evita llamar a endpoints que hoy solo aceptan mensualidad.
- **Móvil:** `DataTable` con `card` + `RowMenu`; el modal conserva `useDismiss` y no pierde cambios al rotar.
- **Error de red:** `toast.error(userMessageFromError(e))`; no se pierde el borrador del formulario salvo tras un guardado exitoso.

---

## 11. Pruebas

### 11.1 E2E nuevos — `src/tests/e2e/tipos-pagos.spec.ts`

Usuarios de fixture (contraseña `Admin123!`): contabilidad `1002026603`, admin `1002026100`, admin temporal `1002026608`, maestro `1002026501`. Periodo activo `a1000000-0000-4000-8000-000000000001`; grado `a2000000-0000-4000-8000-000000000007`; alumna Ana `1002026701` (si el fixture backend 016 siembra tipos/obligaciones).

> **Precondición backend 016:** el fixture debe incluir al menos un tipo adicional periódico con `bloquea_notas = true` y una obligación pendiente para Ana en septiembre, y un tipo con `bloquea_notas = false` para comprobar que no bloquea. Si no se siembra, los tests crean los tipos por UI y el test de liberación se marca como dependiente del fixture.

1. **Página y permisos:** login contabilidad → `/tipos-pagos` → título «Tipos pagos», conteo, buscador «Buscar…», filtros Año/Estado, sin botón «Agregar» (`data-table-add-button` no existe o no es de periodo); la fila del periodo muestra chips Mensualidad/Matrícula/+N y meses.
2. **Clic derecho y doble clic:** clic derecho en la fila → «Ver» abre `tipos-pago-modal`; cerrar; doble clic abre lo mismo.
3. **Móvil:** viewport `< 768px` → card del periodo con `RowMenu`; abrir «Ver» desde el menú de 3 puntos.
4. **Crear adicional periódico:** «Agregar tipo» → nombre «Cuota de laboratorio», monto 500, Periódico, «Bloquea notas» activo, destino Modalidad; guardar/confirmar → aparece en la lista con badges Periódico y Bloquea notas.
5. **Persistencia y edición:** reabrir modal → el tipo persiste; Editar → cambiar monto a 600 y descripción; guardar → se ve 600.
6. **Destinos OR/AND:** crear otro tipo con reglas Grado 7.º y Sección 7.º A; el resumen muestra 2 reglas; sin reglas muestra «Todos los alumnos del periodo»; avanzado permite elegir curso/alumno y el resumen lo refleja.
7. **Tipo único:** crear «Gira» → Único → fecha de vencimiento visible con la fecha sugerida; guardar; la fila muestra el badge Único y la fecha.
8. **Bloquea notas por defecto:** en el formulario nuevo, el checkbox/toggle está activo; al desmarcarlo y guardar, la lista muestra «No bloquea notas».
9. **Editar mensualidad:** fijo Mensualidad → «Editar meses y bloqueo» → desmarcar un mes → guardar → se refleja en el modal; Matrícula solo permite el toggle y muestra el enlace a Configuración de pagos.
10. **Eliminar adicional:** crear un tipo sin obligaciones → Eliminar → `ConfirmDialog` danger → confirmar → desaparece. Un tipo con obligaciones devuelve error y no desaparece (si el fixture lo permite).
11. **Configuración de meses:** `/configuracion-pagos` → abrir modal del periodo → «Meses que se cobran» con meses sugeridos; desmarcar todos → error y Guardar deshabilitado; marcar uno → guardar/confirmar; reabrir y persiste. Si el periodo ya tenía config, el diálogo retroactivo muestra el texto de meses y pagos.
12. **Meses con pagos:** si el fixture tiene un mes pagado, su checkbox está deshabilitado y no se puede quitar.
13. **Caja muestra tipos:** `/pagos` → columna Tipo y filtro Tipo; la fila de matrícula y la de tipo adicional aparecen; el modal de registrar pago muestra «Matrícula y otros conceptos» y permite seleccionar/cobrar una obligación adicional (sin cambiar el flujo de mensualidades).
14. **Bloqueo de notas:** `/liberacion-notas` → alumno con laboratorio pendiente → la tabla/detalle muestra «Cuota de laboratorio» y el badge «Bloquea notas»; el portal muestra el mensaje con el nombre del tipo (si el backend lo devuelve); un tipo con `bloquea_notas = false` no aparece como bloqueo.
15. **Regresión de roles:** maestro sin `pagos_config:get` no ve el menú «Tipos pagos» y recibe «No tienes permiso» al entrar por URL.

### 11.2 Regresión obligatoria

- `src/tests/e2e/configuracion-pagos.spec.ts` (el modal actual de días, montos y mora sigue igual; los nuevos meses no rompen los `data-testid`).
- `src/tests/e2e/pagos.spec.ts` (tabla, Ver, Editar, Anular, Registrar pago y `pago-mes-2026-*`).
- `src/tests/e2e/recibos.spec.ts` (validar recibo y corrección de mes).
- `src/tests/e2e/liberacion.spec.ts` (parciales, bloqueados y forzar).
- `src/tests/e2e/analitica-pagos.spec.ts` (tarjetas, medidores, descargas; la nueva tarjeta es opcional).
- `src/tests/e2e/caja-cartera.spec.ts` (alumnos/padres y Cobrar).
- Recomendados: `portal.spec.ts`, `permisos.spec.ts`, `modulos.spec.ts`, `smoke.spec.ts`.

### 11.3 Comandos

```powershell
pnpm lint
pnpm exec tsc --noEmit
pnpm build
pnpm test:e2e:smoke
pnpm exec playwright test src/tests/e2e/tipos-pagos.spec.ts
pnpm exec playwright test src/tests/e2e/configuracion-pagos.spec.ts src/tests/e2e/pagos.spec.ts src/tests/e2e/recibos.spec.ts
pnpm exec playwright test src/tests/e2e/liberacion.spec.ts src/tests/e2e/analitica-pagos.spec.ts src/tests/e2e/caja-cartera.spec.ts
pnpm check
```

> Los e2e levantan backend en :8081, front en :3001 y recrean `molde_test` (ver `MAPA.md`). Si el backend 016 aún no está desplegado, `tipos-pagos.spec.ts` debe quedar marcado como `@backend-016` y no bloquear la regresión.

---

## 12. Riesgos

- **Contrato de meses ambiguo:** enviar solo números perdería el año. Se fija `MesCobro[]`; si el backend prefiere `number[]`, el adaptador debe vivir en un solo helper y no en la UI.
- **Doble fuente para meses:** `PUT /pagos/configuracion` y `PUT /pagos/configuracion/{id}/mensualidad` deben tocar el mismo dato. Mitigación: backend con una sola función de guardado y frontend que invalida ambas queries.
- **Semántica de `bloquea_notas`:** si el backend no la implementa, la UI parecerá configurar algo que no bloquea. Mitigación: la spec backend 016 debe definir la regla y los tests de liberación deben cubrir tipos adicionales.
- **Regresiones en `/pagos`:** cambiar `MensualidadFila` a `ObligacionFila` toca la tabla, filtros, exportación y modales. Mitigación: alias de tipo, mantener `data-testid` de mensualidades y correr `pagos.spec.ts` antes de ampliar.
- **Anulación/edición de tipos no mensuales:** el backend actual solo anula mensualidades. Mitigación: en esta versión solo se ofrecen «Ver» y «Registrar pago» para matrícula/adicionales.
- **N+1 en `/tipos-pagos`:** pedir tipos por fila sería lento. Mitigación: `tipos_resumen` y `meses` en el listado de periodos; el detalle se pide solo al abrir el modal.
- **Opciones de destino grandes:** muchos alumnos/cursos pueden hacer pesado el árbol. Mitigación: endpoint acotado al periodo, búsqueda «Buscar…» en avanzado y scroll dentro del modal.
- **Permisos:** contabilidad no tiene catálogos; cualquier intento de reutilizar `/catalogos/*` fallará. Mitigación: un único endpoint de opciones bajo `pagos_config:get`.
- **Caché:** guardar tipos/meses debe invalidar caja, cartera, analítica y liberación; si falta una key, la UI muestra datos viejos. Mitigación: helper `invalidarPagos(qc, periodoId)` compartido.
- **Datos históricos:** eliminar un tipo no debe borrar obligaciones/pagos. Mitigación: backend 409 si hay obligaciones; el frontend no borra localmente hasta confirmar respuesta.
- **Accesibilidad/móvil:** árboles anidados y modales grandes. Mitigación: reutilizar patrones de `CoordinacionWizard` y `TipoFichaModal`; probar en `< 768px`.

---

## 13. Fuera de alcance

- Implementación backend, migraciones SQL, generación de obligaciones, recálculo retroactivo y motor de bloqueo de notas (spec 016).
- Crear periodos desde `/tipos-pagos` (siguen en Catálogos → Periodos).
- Editar montos por grado desde `/tipos-pagos` (siguen en `/configuracion-pagos`).
- Cobro o anulación de matrícula/adicionales con endpoints distintos al actual; se reutiliza `POST /pagos/cobro` y solo se amplía la lectura.
- Portal del responsable: **incluido** en esta versión (§5.8.1). `/hijo/pagos` lista mensualidad, matrícula y adicionales, y permite subir comprobante por `obligacion_pago_id`; los recibos se validan en caja. El portal de calificaciones solo muestra el mensaje/badge de bloqueo que envíe el backend.
- App móvil Flutter.
- Notificaciones nuevas o segmentos por tipo de pago.
- Edición masiva de obligaciones o de tipos entre periodos.
- Nuevos permisos o roles.
- Cambios en `MAPA.md`, `API_CLIENTES.md` o `EVOLUCION.md` en este paso.

---

## 14. Criterios de aceptación

1. `/configuracion-pagos` muestra «Meses que se cobran» con los meses del periodo (y del año siguiente si cruza), preselecciona los meses del periodo y permite marcar/desmarcar.
2. No se puede guardar sin al menos un mes; el error es visible y el botón queda deshabilitado.
3. Si el periodo ya tenía configuración, el diálogo retroactivo explica la inactivación de pendientes/en mora y el bloqueo por pagos.
4. Los meses con pagos se muestran deshabilitados y no se pueden quitar; el backend rechaza el intento con un mensaje claro.
5. `/tipos-pagos` existe, usa `pagos_config:get`, muestra una fila por periodo, sin «Agregar periodo», con Periodo/Año/Estado/Tipos/Meses, filtros Año/Estado y exportación.
6. Clic derecho «Ver» y doble clic abren el modal; en móvil se usa el menú de 3 puntos.
7. El modal muestra «Pagos fijos» con Mensualidad y Matrícula, badges Fijo/Periódico/Único, sin eliminarlas, y enlace/indicación de que el monto se edita en Configuración de pagos.
8. La mensualidad permite editar meses y bloqueo; la matrícula solo bloqueo.
9. «Tipos adicionales» lista los tipos, permite «Agregar tipo», Editar y Eliminar con `ConfirmDialog danger`.
10. El formulario de adicional tiene nombre, descripción, monto, segmentado Periódico/Único, «Bloquea notas» activo por defecto y destinos con tabs Modalidad/Grado/Sección/Avanzado.
11. Sin reglas = todos; varias reglas = OR; dentro de una regla los campos son AND; avanzado permite cursos/alumnos específicos; el resumen refleja las reglas.
12. Periódico usa los meses del periodo; único muestra «Fecha de vencimiento» con la fecha sugerida.
13. La lista/modal muestra badge «Bloquea notas» / «No bloquea notas» y el toggle se puede cambiar en fijos y adicionales.
14. `/pagos` muestra mensualidad, matrícula y adicionales con columna y filtro «Tipo»; se pueden cobrar por obligación y el flujo de mensualidades sigue igual.
15. Cartera y analítica muestran los tipos pendientes (`/alumnos`, `/padres`, `/analitica-pagos`), sin degradados y sin cambiar el semáforo de pago basado en mensualidades.
16. `/liberacion-notas` y el portal muestran el bloqueo con el nombre del tipo cuando el backend lo devuelve; no se inventa lógica de bloqueo en el frontend.
16.1. **Portal del padre:** `/hijo/pagos` lista mensualidad, matrícula y adicionales con tipo, monto, mora, total, vencimiento, estado y badge «Bloquea notas»; el total pendiente incluye todos los tipos.
16.2. **Comprobante:** el padre puede subir comprobante de matrícula/adicional por `obligacion_pago_id`; caja lo ve en `/recibos`, lo aprueba/deniega y la obligación correcta cambia de estado. Los recibos de mensualidad siguen funcionando igual.
17. `nav.ts` y el command palette incluyen «Tipos pagos»; no se crea permiso nuevo ni se toca `ROLE_PERMISSIONS`.
18. Las opciones de destino se piden bajo `pagos_config:get`, nunca con `catalogos:get`.
19. Los e2e nuevos y la regresión de `configuracion-pagos`, `pagos`, `recibos`, `liberacion`, `analitica-pagos` y `caja-cartera` pasan; `lint`, `tsc --noEmit` y `build` sin errores.
20. Sin backend 016, las pantallas actuales siguen funcionando; los campos nuevos se degradan a vacío/oculto sin romper.

---

## 15. Documentación pendiente (no editar ahora)

Al terminar la implementación, **preguntar** antes de actualizar:

- `sasha_fronted/documentacion/MAPA.md`: filas de `/configuracion-pagos`, `/tipos-pagos`, `/pagos`, `/alumnos`, `/padres`, `/analitica-pagos`, `/recibos`, `/liberacion-notas` y la sección «Componentes que importan» (`TiposPagoPeriodoModal`, `TipoPagoAdicionalModal`, `MesesCobro`, `DestinosTipoPago`).
- `sasha_fronted/documentacion/API_CLIENTES.md`: `GET /pagos/configuracion/periodos` extendido, `GET /pagos/configuracion/{id}/tipos`, CRUD de tipos, opciones, `PUT` de mensualidad/matrícula, `meses` en configuración, campos de `/pagos/mensualidades`, cartera/analítica/recibos y bloqueos de liberación/portal.
- `sasha_fronted/documentacion/EVOLUCION.md`: bitácora de la feature.
- `backend_sasha/documentacion/MAPA.md` y `API_CLIENTES.md` en la spec 016 (fuera de esta capa).

> No se edita ninguno en este paso. La regla `MAPA` exige preguntar antes de tocarlos y antes de incluirlos en un commit. Este plan no crea `tasks.md` ni implementa código.
