# Checklist de Tareas: Asistencia configurable por sección — Frontend

> Feature `023-asistencia-por-seccion` · Capa **frontend** (`sasha_fronted/`)
> Fuente de arquitectura: `spec/023-asistencia-por-seccion/plan.md`
> Autoridad del contrato: `backend_sasha/spec/015-asistencia-por-seccion/plan.md` §4.2–4.5
> Estado: checklist previo a implementación. **No se implementó código al escribir este documento.**
>
> **Regla de compatibilidad obligatoria:** si `modo_asistencia` falta, viene vacío o no es reconocido, todo se comporta como `CLASE`. Nunca se infiere el modo por la presencia de un responsable. Sin `modo_asistencia` no debe aparecer ninguna novedad ni romperse `/asistencia`, `/maestro` ni el dashboard.
>
> **Estado 2026-10-26:** código implementado; `tsc --noEmit`, ESLint de los archivos tocados y `pnpm build` **PASS**. Los e2e quedan pendientes de aplicar la migración 065 y levantar el backend. `MAPA.md`, `API_CLIENTES.md` y `EVOLUCION.md` actualizados.

---

## 0. Nota de reconciliación de endpoints

El plan frontend proponía rutas intermedias que **no** son la autoridad. Este checklist usa exclusivamente el contrato del backend 015:

| Uso | Endpoint autoritativo |
|---|---|
| Secciones que el usuario puede atender | `GET /asistencia/seccion/mias` |
| Semana de una sección | `GET /asistencia/seccion/semana?seccion_id=&fecha=` |
| Guardar lista completa de una sección | `POST /asistencia/seccion/lote` |
| Corregir una celda puntual de una sección | `PUT /asistencia/seccion/celda` |

**No usar** `/asistencia/secciones` ni `/asistencia/secciones/{id}/semana` (nombres del plan frontend anterior). Si aparecen en el código, se corrigen a las rutas de la tabla.

Diferencias de forma que condicionan las tareas:

- `GET /asistencia/seccion/mias` devuelve `{ "secciones": [...] }`, con `responsable` anidado, `clases_hoy` y `puede_editar`. **No** devuelve `estado_hoy`, `marcas_hoy` ni `grado_id` planos. El frontend normaliza a un tipo propio.
- `GET /asistencia/seccion/semana` devuelve `dias[]` con `tiene_clases`, `pasado`, `registrado_por`, `maestro_registro` y `registrado_en`; las marcas traen `mixto` y `origen`. **No** devuelve `dias[].estado`, `dias[].clases` ni `tomada_por_*`; se mapean `mixto`, `registrado_por` y `maestro_registro`.
- `POST /asistencia/seccion/lote` recibe `{ seccion_id, fecha, items: [{ alumno_id, tipo_codigo, observaciones? }] }` y responde `201` con `guardadas`, `alumnos_guardados`, `clases_afectadas`, `clases_detalle` y `bloqueadas`. No devuelve `alumnos` ni `avisos_enviados`.
- `PUT /asistencia/seccion/celda` recibe `{ seccion_id, alumno_id, fecha, tipo_codigo }` y responde el mismo shape del lote con `alumnos_guardados = 1`. Se reserva para corrección puntual; el flujo principal de la grilla usa el lote.
- El dashboard del maestro usa el campo nuevo `asistencia_general` (con `puede_editar`, `es_responsable`, `pasada`, `marcas`, `alumnos`). **No** se deben esperar `materia.modo_asistencia` ni `asistencia_hoy.modo`, que eran propuestas del plan frontend.
- `GET /asistencia/materias` agrega `modo_asistencia`, `responsable_nombre` y `responsable_code`. **No** agrega `seccion_id` ni `es_responsable`; la resolución de la sección desde una fila se hace con el helper de la tarea 1.9 y, si no se puede resolver, se oculta la acción de sección sin romper la pantalla.
- `GET /catalogos/secciones` devuelve `modo_asistencia` y los campos del responsable, pero **no** el periodo de la configuración. El periodo activo del formulario se obtiene de `listPeriodos()` filtrando `status === 'ACTIVE'`.
- Los errores de negocio del backend 015 que el frontend debe tratar: `400` por fecha futura/fuera del periodo, `403` por no ser responsable, `409` por sección en modo `CLASE`, sin clases ese día, sin alumnos activos o celda bloqueada por excusa. El plan frontend hablaba de `400` para “sin clases”; la autoridad es `409`.

---

## Fase 1: Contratos, tipos, servicios y helpers

- [ ] **1.1 — Tipos de sección y modo.** En `src/services/catalogos.ts`, agregar `export type ModoAsistencia = 'CLASE' | 'SECCION'`; extender `Seccion` con `modo_asistencia?`, `maestro_responsable_id?`, `maestro_responsable_nombre?` y `maestro_responsable_code?`; extender `SeccionCreate` con `modo_asistencia?` y `maestro_responsable_id?`. No agregar campos de periodo a `Seccion` porque el backend 015 no los devuelve. **Cubre:** criterios 1, 2, 3, 4 y 16.
- [ ] **1.2 — Extensión de `AsistenciaMateria`.** En `src/services/asistencia.ts`, agregar `modo_asistencia?`, `responsable_nombre?` y `responsable_code?`. No agregar `seccion_id` ni `es_responsable`: no vienen en el contrato 015. Mantener todos los campos actuales. **Cubre:** criterios 6, 7 y 16.
- [ ] **1.3 — Tipos de secciones atendibles.** En `src/services/asistencia.ts`, definir los tipos crudos de `GET /asistencia/seccion/mias` (`SeccionResumen`, `MisSeccionesResponse`) y un tipo normalizado `AsistenciaSeccion` con `seccion_id`, `seccion_nombre`, `grado_nombre`, `modalidad_nombre`, `alumnos`, `puede_editar`, campos planos del responsable y, como opcionales para los casos que vienen del dashboard, `periodo_academico_id?`, `periodo_nombre?`, `clases_hoy?` y `estado_hoy?`. Aplanar `responsable` en la normalización. **Cubre:** criterio 5.
- [ ] **1.4 — Tipos de la semana de sección.** En `src/services/asistencia.ts`, definir `SemanaSeccionDia` (`fecha`, `dia_semana`, `etiqueta`, `tiene_clases`, `pasado`, `registrado_por?`, `maestro_registro?`, `registrado_en?`), `SemanaSeccionMarca` (incluye `mixto`, `origen`, `bloqueada`, `excusa_tipo`), `SemanaSeccionAlumno` y `SemanaSeccionResponse` (incluye `puede_editar` y `responsable` anidado). No usar `dias[].estado`, `dias[].clases` ni `tomada_por_*`. **Cubre:** criterios 8 y 10.
- [ ] **1.5 — Servicios de lectura de sección.** En `src/services/asistencia.ts`, implementar `getSeccionesAsistencia()` contra `GET /asistencia/seccion/mias` (usar `apiRequest`, no `apiRequestList`, porque la respuesta es un objeto con `secciones`) y `getSemanaSeccion(seccionId, fecha?)` contra `GET /asistencia/seccion/semana?seccion_id=&fecha=`. Normalizar la respuesta de `mias` al tipo `AsistenciaSeccion[]`. **Cubre:** criterios 5, 8 y 10.
- [ ] **1.6 — Servicios de escritura de sección.** En `src/services/asistencia.ts`, implementar `guardarListaSeccion(body: { seccion_id; fecha; items })` contra `POST /asistencia/seccion/lote` y `putCeldaSeccion(body: { seccion_id; alumno_id; fecha; tipo_codigo })` contra `PUT /asistencia/seccion/celda`. Tipar la respuesta común (`guardadas`, `alumnos_guardados`, `clases_afectadas`, `clases_detalle`, `bloqueadas`). **Cubre:** criterios 8, 9, 10 y 11.
- [ ] **1.7 — Ciclo de letras de sección.** En `src/services/asistencia.ts`, agregar `LETRA_CYCLE_SECCION = ['A', 'T', 'E', 'F']` y `nextLetraSeccion(actual)`, sin estado vacío. Reutilizar `LETRA_TO_CODIGO` para enviar códigos canónicos o letras aceptadas por el backend. **Cubre:** criterio 8.
- [ ] **1.8 — Dashboard y detalle de inasistencias.** En `src/services/maestro-dashboard.ts`, agregar el tipo opcional `asistencia_general` con `seccion_id`, `seccion_nombre`, `modo_asistencia`, `responsable_id?`, `responsable_code?`, `responsable_nombre?`, `es_responsable`, `puede_editar`, `pasada`, `alumnos`, `marcas` y `fecha`. En `src/services/asistencia.ts`, extender `InasistenciaDetalleItem` con `maestro_nombre?` y `maestro_code?`. **Cubre:** criterios 7, 10, 13 y 16.
- [ ] **1.9 — Helper de asistencia por sección.** Crear `src/helpers/asistencia-seccion.ts` con `normModoAsistencia(valor)` (default `CLASE`), `esModoSeccion(valor)`, `puedeConfigurarAsistenciaSeccion(roles)` (`admin` o `admin_temporal`), `etiquetaModo`, `seccionDesdeDashboard(dashboard)` (usa `asistencia_general` y completa grado/modalidad/periodo con `dashboard.materia`; deja periodo y clases como opcionales si no vienen), `seccionDesdeMateria(materia, secciones)` (empareja `periodo_academico_id`, `grado_nombre`, `modalidad_nombre` y `seccion_nombre`; devuelve `null` si no hay match) y `estadoHoySeccion(seccion)` (deriva `sin_clase` de `clases_hoy === 0` y usa `estado_hoy`/`pasada`/`marcas` solo si el backend los trae). **Cubre:** criterios 1, 2, 5, 7 y 16.

---

## Fase 2: Refactor de la grilla y componentes de sección

- [ ] **2.1 — Grilla presentacional compartida.** Crear `src/components/asistencia/AsistenciaGrid.tsx` sin fetch ni mutaciones. Definir `GrillaDia`, `GrillaMarca` (incluye `mixto?`), `GrillaAlumno` y `CambioGrilla`; aceptar las props del plan (`dias`, `alumnos`, `cambios`, `onCycle`, `readOnly`, `saving`, `vista`, `onVistaChange`, `mostrarSelectorFecha`, `fechaRef`, `onFechaRefChange`, `filtro`, `onFiltroChange`, `toolbarExtra`, `leyendaExtra`, `aviso`, `footer`, `inline`, `titulo`). Conservar exactamente `data-testid="asistencia-semana-table"`, `asistencia-celda-<codigo>-<fecha>`, atributos `data-letra`/`data-dia`/`data-cambio`/`data-bloqueada`, clases `asistencia-celda--*`, leyenda, candado de excusa y bloqueo de días futuros. Usar `SearchInput` con placeholder «Buscar…». **Cubre:** criterios 8, 14 y 15.
- [ ] **2.2 — Hook de borrador compartido.** Crear `src/components/asistencia/useBorradorAsistencia.ts` con `cambios`, `cycleCelda`, `descartar`, `totalCambios`, `confirmGuardar`, `confirmSalir`, `setCambios` y `reset`. El ciclo de letras debe ser inyectable o parametrizado para usar `nextLetra` en modo clase y `nextLetraSeccion` en modo sección; las reglas de día futuro y celda con excusa viven una sola vez aquí. **Cubre:** criterios 8, 9 y 15.
- [ ] **2.3 — Refactor de `AsistenciaGridModal`.** Modificar `src/components/asistencia/AsistenciaGridModal.tsx` para usar `AsistenciaGrid` y `useBorradorAsistencia`, manteniendo su API pública (`materia`, `mode`, `onClose`, `inline`, `extraActions`) y todos sus `data-testid` y comportamientos. Reemplazar `todayISO()` local por `hoyISO()` de `src/lib/fechas-padre.ts`. No cambiar los test ids que usan los e2e actuales. **Cubre:** criterios 8, 14, 15 y 16.
- [ ] **2.4 — Esqueleto del modal de sección.** Crear `src/components/asistencia/AsistenciaSeccionModal.tsx` con props `{ seccion, mode, onClose, inline?, fechaInicial? }` y `data-testid="asistencia-seccion-modal"`. Consultar `getSemanaSeccion` con query key `['asistencia-semana-seccion', seccion.seccion_id, fechaRef]` y `staleTime` de 15 segundos. Título `Asistencia · <grado> <sección> · <periodo>` sin curso (`h1` si `inline`). Vista `día` por defecto en `pasar` y `semana` en `editar`/`ver`; selector de fecha solo en `editar`/`ver`, con `max={hoyISO()}` y bloqueado mientras haya cambios. No mostrar botón de PDF. **Cubre:** criterios 8, 10 y 14.
- [ ] **2.5 — Grilla de sección, meta e histórico.** En `AsistenciaSeccionModal.tsx`, mapear la semana a `GrillaDia`/`GrillaAlumno` usando `tiene_clases` como deshabilitado y `mixto` en las marcas. Ciclo `A → T → E → F → A` sin vacío. En modo `pasar`, pintar `A` en el borrador cuando el día no tenga registro; en `editar`/`ver`, conservar vacío lo no registrado. Mostrar `Tomada por` (`asistencia-seccion-tomada-por`) usando `maestro_registro` y, si falta, `registrado_por`; nunca el responsable actual. Mostrar `Responsable vigente: <nombre>` en `editar`/`ver` de admin desde `semana.responsable`. Mostrar `Clases afectadas hoy: N` (`asistencia-seccion-clases-afectadas`) solo cuando `seccion.clases_hoy` esté disponible; si se abrió desde el dashboard y no viene, mostrar `—` sin inventar el dato. **Cubre:** criterios 8 y 10.
- [ ] **2.6 — Guardado completo, mixto y errores.** En `AsistenciaSeccionModal.tsx`, detectar marcas con `mixto === true` y mostrar el banner `asistencia-seccion-mixto` con confirmación extra. Guardar con `guardarListaSeccion` enviando **todos** los alumnos y `A` para los no marcados; el `ConfirmDialog` (`asistencia-seccion-confirmar`) debe decir «Se guardará la asistencia de N alumnos y afectará a M clases. Se avisará a los padres de faltas y tardanzas.». Al éxito: snackbar «Asistencia de la sección guardada», recargar la semana, limpiar borrador e invalidar `['asistencia-secciones']`, `['asistencia-semana-seccion', seccionId]`, `['asistencia-materias']`, `['maestro-dashboard']` y `['asistencia-inasistencias']`. Tratar `400` (fecha futura/fuera de periodo), `403` (no responsable), `409` (modo `CLASE`, sin clases, sin alumnos, excusa) y `bloqueadas`; si el guardado falla, conservar el borrador. **Cubre:** criterios 9, 10 y 11.
- [ ] **2.7 — Corrección puntual con `PUT /asistencia/seccion/celda`.** En `AsistenciaSeccionModal.tsx`, agregar una corrección puntual opcional en modo `editar` para una celda ya guardada de un día con marcas, usando `putCeldaSeccion`, con confirmación y sin reenviar el roster. No reemplazar el flujo principal de guardado por lote ni su texto de confirmación. Invalidar las mismas query keys y tratar el `409` de excusa. **Cubre:** criterios 9 y 11.
- [ ] **2.8 — Selector de sección.** Crear `src/components/asistencia/SeccionPickerModal.tsx` con `Modal` `wide`, título «Pasar asistencia», subtítulo «Tienes N secciones a tu cargo» y una fila por sección (con `data-testid` `seccion-picker-item-<seccion_id>`) con grado, sección, modalidad, alumnos, chip de estado y botón «Abrir». Deshabilitar y marcar «Sin clases hoy» cuando `clases_hoy === 0`; si `estado_hoy` no viene, mostrar `Pendiente` y no hacer N llamadas a la semana. Responsive: una columna en móvil y rejilla de 2 desde 720 px; sin degradados. **Cubre:** criterios 5 y 14.
- [ ] **2.9 — Botón general reutilizable.** Crear `src/components/asistencia/PasarAsistenciaSeccionBoton.tsx` con la lógica 1 vs. N secciones: una sección abre directamente el modal mediante callback; dos o más abren el selector; cero secciones no renderiza nada; una única sección con `clases_hoy === 0` se deshabilita. Debe aceptar `testId` para usarse como `hub-pasar-asistencia` o `mdash-pasar-asistencia-seccion`, y no debe hacer fetch. **Cubre:** criterio 5.
- [ ] **2.10 — Estilos mínimos.** En `src/styles/style1.css`, agregar solo si hace falta la variante `.seccion-picker` y badges/chips de sección. Sin degradados; solo tokens `--sasha-*`; conservar responsive. No tocar `style2.css` salvo que un token nuevo lo exija. **Cubre:** criterio 14.

---

## Fase 3: Configuración, hub, dashboard, `/asistencia` e inasistencias

### Formulario y tabla de secciones

- [ ] **3.1 — Periodo activo del formulario.** En `src/routes/_app/catalogos/secciones.tsx`, agregar `useQuery({ queryKey: ['periodos'], queryFn: listPeriodos })` y calcular `periodoActivo = periodos.find((p) => p.status === 'ACTIVE')`. Mostrar `data-testid="seccion-periodo-activo"`; si no hay periodo activo, mostrar «No hay periodo activo» (`seccion-sin-periodo`) y deshabilitar el guardado. Documentar en un comentario que la fuente es `listPeriodos`. **Cubre:** criterio 3.
- [ ] **3.2 — Opciones de maestro responsable.** En el mismo archivo, consultar `['maestros']` con `listMaestros` de `src/services/personas.ts` y filtrar `status === 'ACTIVE'`. Opciones con etiqueta `<user_code> · <nombre>`, `value = id` y `keywords = user_code`; consultar solo cuando el modal esté abierto y el modo sea `SECCION`. No permitir texto libre. **Cubre:** criterio 2.
- [ ] **3.3 — Bloque «Asistencia» del modal.** En `src/routes/_app/catalogos/secciones.tsx`, agregar el bloque antes de «Estado» con el control segmentado existente (`.segmento` / `.segmento__item`, `role="radiogroup"`): «Por clase» (`seccion-modo-clase`, por defecto) y «Por sección» (`seccion-modo-seccion`). Mostrar el periodo activo en lectura y, en `SECCION`, el `Combobox` obligatorio `seccion-maestro-responsable-select`, el error inline `seccion-maestro-responsable-error` y la nota «El responsable pasa una lista diaria para toda la sección. Los registros anteriores conservan al maestro que pasó lista.». Solo `admin`/`admin_temporal` ven el bloque editable; el resto lo ve en lectura si tiene `catalogos:get`. **Cubre:** criterios 1, 2, 3 y 14.
- [ ] **3.4 — Validación y payload.** En el mismo archivo, antes de abrir `ConfirmDialog`, si `SECCION` no tiene `maestro_responsable_id`, no abrir la confirmación, marcar el error inline y enfocar el combo. Si `CLASE`, enviar `maestro_responsable_id: null`. Usar los campos `modo_asistencia` y `maestro_responsable_id` ya tipados en el `form` y en `SeccionCreate`; no enviar nombre ni código del maestro. **Cubre:** criterio 2.
- [ ] **3.5 — Precarga, aviso de cambio e invalidaciones.** En el mismo archivo, hacer que `openEdit` copie `modo_asistencia ?? 'CLASE'` y `maestro_responsable_id ?? ''`; si en `SECCION` cambia el responsable respecto del original, mostrar `seccion-aviso-cambio-responsable`. Si el modo pasa a `SECCION`, la confirmación agrega «La lista de esta sección la pasará <nombre>.». Al guardar, invalidar `['secciones']`, `['asistencia-secciones']`, `['asistencia-materias']` y `['maestro-dashboard']`. **Cubre:** criterios 3, 9 y 16.
- [ ] **3.6 — Tabla de secciones.** En `src/routes/_app/catalogos/secciones.tsx`, agregar la columna «Lista» (`id: 'lista'`) con badge «Por clase» o «Por sección» + `<código> · <nombre>` del responsable; si falta, «Sin responsable» con `badge--warn` y `data-testid` `seccion-lista-<codigo>`. Agregar filtro «Lista» (`id: 'modo'`, `getValue: r => r.modo_asistencia ?? 'CLASE'`) y usar la prop existente `searchText` de `DataTable` para grado, modalidad y responsable; no modificar `DataTable`. `exportRows` debe incluir `{ codigo, nombre, grado, modalidad, lista, responsable, status }`. Mantener el buscador «Buscar…». **Cubre:** criterios 4 y 14.

### Hub del maestro

- [ ] **3.7 — Query de secciones en el hub.** En `src/routes/_app/maestro/index.tsx`, agregar `['asistencia-secciones']` con `getSeccionesAsistencia()`, habilitada solo si `can('asistencia:get')` y el rol es maestro, `admin` o `admin_temporal` (evitar el `403` de otros roles). Usar `retry: false` y tratar el error como silencioso: la página no se rompe y el botón se oculta si el backend 015 aún no existe. **Cubre:** criterios 5 y 16.
- [ ] **3.8 — Botón general del hub.** En el mismo archivo, colocar `PasarAsistenciaSeccionBoton` junto al título con `data-testid="hub-pasar-asistencia"`, visible solo si hay secciones. Con una sección, abrir `AsistenciaSeccionModal` en modo `pasar` con la fecha de hoy; con dos o más, abrir `SeccionPickerModal` y luego la grilla elegida. Si la query falla o no hay secciones, no renderizar el botón. **Cubre:** criterio 5.
- [ ] **3.9 — Tarjetas SECCION del hub.** En `src/routes/_app/maestro/index.tsx`, si `m.modo_asistencia === 'SECCION'` (normalizado) ocultar «Pasar lista» del menú (`maestro-hub-ctx-asistencia`) y mostrar el chip `Asistencia por sección` con `data-testid` `maestro-hub-chip-seccion-<asignacion>`. El ítem opcional `maestro-hub-ctx-asistencia-seccion` solo se agrega si se resuelve que el usuario es responsable con `getSeccionesAsistencia`; no inferirlo de `asistencia:post`. `CLASE` conserva el comportamiento actual y «Ir» (`maestro-hub-ir-*`) funciona en ambos modos. **Cubre:** criterios 6 y 16.

### Dashboard de clase

- [ ] **3.10 — Rama por modo en el dashboard.** En `src/routes/_app/maestro/clases.$asignacionId.tsx`, derivar el modo con `data.asistencia_general?.modo_asistencia ?? 'CLASE'`; no usar `data.materia.modo_asistencia` porque el backend 015 no lo envía. La rama `CLASE` debe quedar idéntica a hoy. **Cubre:** criterios 7 y 16.
- [ ] **3.11 — SECCION con responsable.** En el mismo archivo, en la tarjeta «Alumnos», alimentar pill y ratio con `data.asistencia_general` (`pasada`, `marcas`, `alumnos`). Mostrar el botón primario `mdash-pasar-asistencia-seccion` que abre `AsistenciaSeccionModal` en modo `pasar`, el texto «Asistencia de la sección · <grado> sec<sección>» y **no** mostrar `mdash-pasar-lista`. Construir la sección con `seccionDesdeDashboard` (combinando `asistencia_general` y `materia`); si faltan `alumnos`/`periodo`/datos, la grilla completa con `getSemanaSeccion`. **Cubre:** criterios 7 y 10.
- [ ] **3.12 — SECCION sin responsabilidad.** En el mismo archivo, para `SECCION` y `es_responsable === false`, no mostrar botón de pasar; mostrar el botón ghost `mdash-ver-asistencia-seccion` que abre la grilla en modo `ver` y el aviso `mdash-asistencia-responsable` con «La asistencia de esta sección la registra <nombre del responsable>». Si el backend no manda datos de sección, mostrar `—` y el aviso, nunca el botón de pasar. La sección `CLASE` no se toca. **Cubre:** criterio 7.

### Pantalla `/asistencia`

- [ ] **3.13 — Tabla de clases con modo y responsable.** En `src/routes/_app/asistencia.tsx`, agregar la columna «Lista» con el mismo render de 3.6, el filtro `modo` y `searchText` para grado, sección y responsable. `exportRows` debe agregar `lista` y `responsable`. Mantener «Buscar…». **Cubre:** criterios 12 y 4.
- [ ] **3.14 — Acciones de fila SECCION.** En el mismo archivo, para filas `SECCION`, `Asistencia`/`Editar` abren `AsistenciaSeccionModal` en `editar` si el usuario es `admin`/`admin_temporal` con `asistencia:post`, y en `ver` para el resto; `Ver` abre la grilla de sección en `ver`; usar `data-testid="asistencia-ctx-seccion"`. Resolver `seccion_id` con `seccionDesdeMateria` y `['asistencia-secciones']`; si no se resuelve, ocultar la acción de sección y mantener la fila sin romper la pantalla. `Ver faltas` sigue abriendo `InasistenciasModal` de la **clase**. **Cubre:** criterio 12.
- [ ] **3.15 — Guardas del maestro en `/asistencia`.** En el mismo archivo, si el maestro pertenece a una sección `SECCION`, forzar la grilla inline a `mode="ver"` (el backend rechaza escrituras de clase en `SECCION`). Si es responsable, agregar el acceso `asistencia-seccion-acceso` que abre `AsistenciaSeccionModal` en `pasar`; si no, mostrar solo lectura y el aviso con el responsable. Si `getSeccionesAsistencia` falla, conservar el comportamiento actual sin romper la pantalla y sin agregar entradas de menú ni permisos. **Cubre:** criterios 7, 12 y 16.

### Inasistencias

- [ ] **3.16 — Columna «Registró».** En `src/routes/_app/asistencia.tsx`, dentro de `InasistenciasModal`, agregar la columna «Registró» (`data-testid="asistencia-detalle-registro"`): mostrar `maestro_nombre` y, si existe, `maestro_code` en tono suave; si no viene, `—`. Nunca rellenar con el responsable actual. La tabla resumen de faltas/excusas/tardes no cambia. **Cubre:** criterios 13 y 14.

---

## Fase 4: Pruebas, casos borde, verificación y documentación

### E2E nuevos — `src/tests/e2e/asistencia-seccion.spec.ts`

- [ ] **4.1 — Admin configura Por sección.** Login admin `1002026100`; ir a `/catalogos/secciones`; editar una sección; elegir «Por sección»; seleccionar el maestro por código; guardar y confirmar. Verificar badge «Por sección» y `código · nombre`; recargar y comprobar persistencia. **Cubre:** criterios 1, 2 y 4.
- [ ] **4.2 — Validación de responsable obligatorio.** Guardar `SECCION` sin maestro no abre confirmación y muestra `seccion-maestro-responsable-error`. **Cubre:** criterio 2.
- [ ] **4.3 — Responsable usa el botón general.** Login maestro responsable `1002026501`; en `/maestro` ver `hub-pasar-asistencia`; abrir la grilla; comprobar título `Asistencia · <grado> <sec> · <periodo>`; marcar una celda; «Guardar (n)»; confirmar «N alumnos y M clases»; guardar con éxito. **Cubre:** criterios 5, 8 y 9.
- [ ] **4.4 — Marcas visibles desde otra clase de la sección.** Abrir el dashboard de otra clase de la misma sección; el estado del día coincide, la grilla muestra las mismas marcas y «Tomada por». **Cubre:** criterios 7 y 10.
- [ ] **4.5 — Maestro de clase no puede editar.** Login con un maestro no responsable de una sección `SECCION`; su dashboard muestra «Ver asistencia» y el aviso; no existe `mdash-pasar-lista`; en `/asistencia` la grilla de sección abre en `ver`. **Cubre:** criterios 7 y 12.
- [ ] **4.6 — Admin corrige una sección.** Admin en `/asistencia`; fila `SECCION`; «Asistencia»/«Editar»; cambiar una marca de un día pasado; guardar; reabrir y comprobar el cambio. **Cubre:** criterio 12.
- [ ] **4.7 — Cambio de responsable conserva el histórico.** Admin cambia el responsable; una lista antigua sigue mostrando `Tomada por: <maestro anterior>` y una lista nueva muestra al nuevo. **Cubre:** criterios 3 y 10.
- [ ] **4.8 — Modo Por clase sigue igual.** Una sección `CLASE` conserva «Pasar lista» en el hub y en el dashboard; el flujo actual guarda sin cambios. **Cubre:** criterios 6 y 16.
- [ ] **4.9 — Inasistencias muestra «Registró».** El detalle muestra el maestro de cada marca cuando el backend lo devuelve. **Cubre:** criterio 13.

### Comandos de verificación

- [ ] **4.10 — Ejecutar el e2e nuevo.** Ejecutar `pnpm exec playwright test src/tests/e2e/asistencia-seccion.spec.ts` y registrar PASS/FAIL. **Cubre:** criterio 15.
- [ ] **4.11 — Ejecutar regresión e2e.** Ejecutar `pnpm exec playwright test src/tests/e2e/asistencia.spec.ts src/tests/e2e/maestro-hub.spec.ts src/tests/e2e/catalogos.spec.ts src/tests/e2e/bajas-restauracion.spec.ts src/tests/e2e/permisos.spec.ts` y registrar PASS/FAIL. **Cubre:** criterio 15.
- [ ] **4.12 — Lint.** Ejecutar `pnpm lint` y registrar PASS/FAIL. **Cubre:** criterio 15.
- [ ] **4.13 — TypeScript.** Ejecutar `pnpm exec tsc --noEmit` y registrar PASS/FAIL. **Cubre:** criterio 15.
- [ ] **4.14 — Build.** Ejecutar `pnpm build` y registrar PASS/FAIL. **Cubre:** criterio 15.
- [ ] **4.15 — Formato.** Ejecutar `pnpm check` (prettier) antes del commit y registrar PASS/FAIL. **Cubre:** criterios 14 y 15.
- [ ] **4.16 — Smoke.** Ejecutar `pnpm test:e2e:smoke` y registrar PASS/FAIL. **Cubre:** criterio 15.
- [ ] **4.17 — Reporte final PASS/FAIL.** Entregar una tabla con cada comando, su resultado y la evidencia (número de tests o error). No declarar PASS sin haber ejecutado el comando. **Cubre:** criterio 15.
- [ ] **4.18 — Documentación pendiente (NO EJECUTAR).** Tarea condicionada a que el usuario lo pida: actualizar `sasha_fronted/documentacion/MAPA.md` (rutas `/catalogos/secciones`, `/maestro`, `/maestro/clases/$asignacionId`, `/asistencia` y componentes nuevos), `sasha_fronted/documentacion/API_CLIENTES.md` (los cuatro endpoints de la nota de reconciliación y los campos nuevos) y `sasha_fronted/documentacion/EVOLUCION.md` (bitácora). No editar `MAPA.md` ni la documentación en silencio; preguntar antes y antes de incluirla en un commit. **Cubre:** regla MAPA; no es criterio funcional.

---

## Criterios de aceptación (resumen)

1. El formulario de sección muestra «Por clase» por defecto y «Por sección»; solo `admin`/`admin_temporal` puede cambiarlo.
2. En modo sección exige maestro responsable activo, búsqueda por código o nombre, periodo activo y guarda solo `modo_asistencia` + `maestro_responsable_id`; no acepta texto libre.
3. El formulario muestra el periodo activo y advierte que el cambio aplica desde ahora sin reescribir registros anteriores.
4. La tabla de secciones muestra badge «Por clase»/«Por sección», responsable vigente y filtro por modo, manteniendo «Buscar…».
5. El responsable ve «Pasar asistencia» en `/maestro`; con una sección abre directo y con varias ve un selector con grado, sección, modalidad, alumnos y estado de hoy (o «Sin clases hoy»).
6. Las tarjetas `SECCION` ocultan «Pasar lista», muestran «Asistencia por sección» y conservan «Ir»; `CLASE` no cambia.
7. El dashboard de una clase `SECCION` muestra «Pasar asistencia» al responsable, «Ver asistencia» + aviso al no responsable y conserva `CLASE`.
8. La grilla de sección se titula `Asistencia · <grado> <sección> · <periodo>`, tiene una fila por alumno, celdas `A/T/E/F` con ciclo sin vacío, «Guardar (n)», «Buscar…», días futuros deshabilitados y días pasados editables.
9. Al guardar se envía la lista completa, se confirma «N alumnos y M clases» y se avisa que faltas/tardanzas notifican a los padres.
10. Se muestra «Tomada por» con el maestro histórico del día y «Clases afectadas hoy: N» cuando el dato existe; nunca se pinta el responsable actual sobre registros viejos.
11. Si hay marcas mixtas se muestra el criterio y se permite sobrescribir con confirmación.
12. `/asistencia` muestra modo y responsable, abre la grilla de sección para filas `SECCION` y mantiene solo lectura a quien no tiene `asistencia:post`.
13. El detalle de inasistencias muestra al maestro que registró cada marca cuando el backend lo devuelve.
14. No hay degradados; solo tokens; buscadores con «Buscar…»; `Modal`/`Field`/`Combobox`/`ConfirmDialog`; acciones con `data-testid`; comportamiento responsive.
15. Los e2e nuevos y la regresión de asistencia/hub/catálogos pasan; `lint`, `tsc --noEmit` y `build` sin errores.
16. Sin `modo_asistencia` en backend, todo funciona como hoy en modo `CLASE`; `getSeccionesAsistencia` con error/404 solo oculta la feature y no rompe la pantalla.

---

## Riesgos y casos borde

- **Fan-out y avisos duplicados:** la réplica a N clases puede duplicar notificaciones; el backend 015 deduplica `T`/`F` por alumno/día. El frontend solo muestra la advertencia y no controla el envío.
- **Doble fuente de verdad del modo:** usar siempre `modo_asistencia` del backend; nunca inferirlo por la presencia de responsable. Si falta, `CLASE`.
- **Permiso vs. responsabilidad:** `asistencia:post` lo tienen todos los maestros; ocultar acciones de escritura con `es_responsable`/`puede_editar` y modo `SECCION`, no solo con el permiso.
- **Responsable sin asignaciones:** el hub no puede depender de `asistencia-materias`; requiere `GET /asistencia/seccion/mias`. Si el endpoint falla o devuelve 404, la feature queda invisible (degradación segura).
- **Refactor de ~400 líneas:** riesgo de romper test ids, estilos o el borrador. Mitigación: extracción presentacional sin cambiar clases ni `data-testid`, y correr los e2e actuales antes de agregar la variante.
- **Duplicación en `/asistencia`:** una sección `SECCION` con N clases produce N filas que abren la misma grilla. Es aceptado; se documenta y se filtra por «Lista».
- **Histórico:** no pintar al responsable vigente en días viejos. Usar `maestro_registro`/`registrado_por` y `—` o «Sin dato de registro» si no vienen.
- **Cache:** invalidar por prefijo `['maestro-dashboard']` para que todos los dashboards de la sección reflejen el guardado; la semana de sección usa `staleTime` corto.
- **Zona horaria:** unificar en `hoyISO()`; no usar `toISOString()` para la fecha local.
- **PDF de sección:** fuera de alcance mientras no exista endpoint; no mostrar botón para evitar un 404 confuso.
- **Contrato incompleto de `materias`:** no trae `seccion_id` ni `es_responsable`. Para `/asistencia`, resolver por nombre/periodo contra `mias`; si no hay match, ocultar la acción de sección y no romper la pantalla. Si el backend 015 agrega `seccion_id`, usarlo directamente.
- **Estado del selector:** `mias` no trae `estado_hoy`/`marcas_hoy`; el selector deriva `sin_clase` de `clases_hoy` y cae a «Pendiente» en el resto. Los chips «Incompleta»/«Lista» solo se muestran si el backend expone progreso; no hacer N llamadas a la semana.
- **Clases afectadas:** la semana no trae el número de clases por día; usar `clases_hoy` de `mias` cuando esté disponible y, si se abrió desde el dashboard, mostrar `—` o el `clases_afectadas` de la respuesta del lote después de guardar.
- **Sin periodo activo / sin maestro / maestro inactivo:** bloquear el guardado, mostrar error inline, no abrir confirmación y permitir corregir el responsable; el backend devuelve `400`/`404`.
- **Sección sin clases o sin alumnos:** el backend responde `409`; mostrar el mensaje, `empty-state` inline y no habilitar el guardado.
- **Fecha futura:** `max={hoyISO()}` en el selector y celdas futuras no editables; el backend también rechaza con `400`.
- **Excusa registrada:** celda con candado; en lote se devuelve en `bloqueadas` y en corrección puntual el backend responde `409`. No perder el borrador salvo tras recarga exitosa.
- **Cambio de responsable:** avisar en el formulario; los registros anteriores conservan `maestro_registro`/`registrado_por`; invalidar `['secciones']` y `['asistencia-secciones']`.
- **Móvil (< 768 px):** scroll horizontal de la grilla, toolbar apilada, celdas más grandes y modales a ancho completo; sin degradados.
- **Backend 015 no desplegado:** `modo_asistencia` ausente ⇒ todo `CLASE`; `getSeccionesAsistencia` 404/error ⇒ ocultar el botón general y no romper `/asistencia` ni `/maestro`.
