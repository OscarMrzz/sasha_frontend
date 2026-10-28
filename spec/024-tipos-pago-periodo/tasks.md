# Checklist de Tareas: Tipos de pago por periodo — Frontend

> Feature `024-tipos-pago-periodo` · Capa **frontend** (`sasha_fronted/`) · React 19 + TanStack Start.
> Origen: `sasha_fronted/spec/024-tipos-pago-periodo/plan.md`.
> Contrato autoritativo: `backend_sasha/spec/016-tipos-pago-periodo/plan.md` (spec backend 016). Donde el plan frontend difiere, manda backend 016 y se deja nota.
> Estado: **pendiente**. No se implementó código al escribir este checklist.
> Convención: cada `- [ ]` es una tarea verificable. Marcar `- [x]` solo al completarla y comprobarla. IDs jerárquicos por fase.
>
> Reglas fijas: sin degradados; solo tokens `--sasha-*`; buscador «Buscar…» (`REG-UI-11`); registros con `DataTable` (`REG-UI-12`); permisos existentes `pagos_config:get|put`; nunca llamar a `/catalogos/*` para las opciones de destino; el frontend **no calcula** bloqueos de notas.

---

## Conciliación de endpoints: backend 016 es la autoridad

| Uso | Ruta backend 016 (usar esta) | Ruta del plan frontend (difiere) | Acción / nota |
|---|---|---|---|
| Listado de periodos para `/tipos-pagos` | `GET /pagos/tipos-pago` | `GET /pagos/configuracion/periodos` | Backend devuelve una fila por periodo con `meses_modo`, `meses_cobro`, `tipos_total`, `tipos_adicionales`, `obligaciones_pendientes`, `monto_pendiente`; **no** devuelve `tipos_resumen` ni `meses[]`. Adaptar columnas/chips a esos conteos. |
| Opciones de destino | `GET /pagos/tipos-pago/opciones?periodo_id=&q=` | `GET /pagos/configuracion/opciones?periodo_id=` | Usar la ruta backend. Contabilidad no tiene `catalogos:get`. |
| Detalle de tipos del periodo | `GET /pagos/tipos-pago/{periodo_id}` | `GET /pagos/configuracion/{periodo_id}/tipos` | Backend devuelve `meses` y un arreglo único `tipos[]` con `es_fijo`, `editables` y `resumen`; **no** devuelve `fijos`/`adicionales` separados. Adaptar agrupando por `es_fijo`. |
| Crear adicional | `POST /pagos/tipos-pago/{periodo_id}` | `POST /pagos/configuracion/{periodo_id}/tipos` | Usar la ruta backend. El `codigo` lo genera el backend; el cliente no lo envía. |
| Editar adicional o fijo | `PUT /pagos/tipos-pago/{periodo_id}/{tipo_id}` | `PUT /pagos/configuracion/{periodo_id}/tipos/{tipo_id}` | En fijos solo acepta `bloquea_notas`; cualquier otro campo responde `400`. |
| Eliminar adicional | `DELETE /pagos/tipos-pago/{periodo_id}/{tipo_id}` | `DELETE /pagos/configuracion/{periodo_id}/tipos/{tipo_id}` | Soft delete; `409` si hay pagos; fijos responden `400`. |
| Configuración del periodo | `GET/PUT /pagos/configuracion/{periodo_id}` | Misma ruta | Backend devuelve `meses` como objeto `{modo, anio_lectivo, rango, seleccionados, opciones}`; el `PUT` usa `meses_modo` (`auto`/`manual`) + `meses`. El plan frontend esperaba `meses[]`, `meses_sugeridos` y `meses_opciones`; adaptar en helpers. |
| Meses de Mensualidad | `PUT /pagos/configuracion/{periodo_id}` con `meses_modo:"manual"` + `PUT /pagos/tipos-pago/{periodo_id}/{tipo_id}` con `bloquea_notas` | `PUT /pagos/configuracion/{periodo_id}/mensualidad` | **La ruta `/mensualidad` no existe en backend 016.** Hacer dos llamadas y reportar el resultado conjunto. |
| Bloqueo de Matrícula | `PUT /pagos/tipos-pago/{periodo_id}/{tipo_id}` con `{ bloquea_notas }` | `PUT /pagos/configuracion/{periodo_id}/matricula` | **La ruta `/matricula` no existe en backend 016.** Usar la ruta de tipos. |
| Caja | `GET /pagos/mensualidades` con campos `tipo_codigo`, `tipo_nombre`, `tipo`, `es_mensualidad`, `etiqueta` y filtros `tipo`/`tipo_pago_id` | Campos `tipo_pago_codigo`, `tipo_pago_nombre`, `tipo_pago_grupo` | Adaptar nombres en `services/pagos.ts`; conservar alias y no cambiar `POST /pagos/cobro`. |
| Anular pago | `POST /pagos/mensualidades/{id}/anular` ya acepta cualquier obligación | El frontend lo limitaba a mensualidades | La UI puede mantener la restricción conservadora de esta versión, pero no debe asumir que backend rechazará otros tipos. |
| Liberación de notas | Backend devuelve `conceptos_pendientes` y `tipos_bloqueantes` | El plan frontend esperaba `bloqueos[]` | Adaptar para pintar tipo + concepto/meses; si no viene, usar `meses` como hoy. |
| Portal | Backend devuelve `mensaje` y `conceptos_pendientes`/`tipos_bloqueantes`, y `GET /portal/pagos` agrega `obligaciones[]`; `POST /portal/recibos` acepta `obligacion_pago_id` | El plan frontend esperaba solo `bloqueos[]` | Pintar `mensaje`/chips y, además, listar todas las obligaciones en `/hijo/pagos` y subir comprobante por `obligacion_pago_id`; el portal no decide el bloqueo. |
| Cartera | Backend agrega `obligaciones_vencidas` y suma al `monto_vencido` | El plan frontend esperaba `tipos_pendientes[]` | Mostrar chips de tipos solo si el backend los envía; si no, mostrar el resumen de vencidas sin deducir nombres. |
| Analítica | Backend incluye tipos en morosos y conceptos en `meses[]`; `por_tipo` no está confirmado | El plan frontend esperaba `por_tipo[]` | Mostrar «Por tipo» solo si `por_tipo` existe; los tipos en morosos salen de los conceptos del backend. |
| Recibos | Backend no garantiza campos de tipo en esta fase | El plan frontend los esperaba opcionales | Columna/filtro Tipo solo si vienen; degradar sin romper. |

> **Notas de contrato que afectan la UI:**
> 1. Backend no expone `tiene_pagos` por mes; el conflicto se conoce por `409` con la lista de meses. No deshabilitar meses por inferencia local.
> 2. Backend no expone `fecha_vencimiento_sugerida` en el detalle de tipos; si falta, derivarla del `dia_pago` solo como ayuda visual.
> 3. Las reglas del backend usan campos singulares (`alumno_id`, `curso_id`), mientras la UI del plan usaba arreglos (`alumno_ids`, `curso_ids`); adaptar en un solo helper.
> 4. `meses_modo` ausente significa «no tocar meses»; para guardar una selección explícita enviar `"manual"` y `meses` no vacío.

---

## Estado de implementación (2026-10-28)

> Implementado y probado en esta sesión. Las casillas de abajo quedan como referencia del plan; este bloque manda.

| Fase | Estado |
|---|---|
| 1. Contratos, servicios y adaptadores | **Hecha** (`services/pagos-tipos.ts`, tipos de meses, adaptadores) |
| 2. Configuración de pagos — meses | **Hecha** (automático/manual, botones de mes, validación) |
| 3. Página `/tipos-pagos` | **Hecha** (registros, filtros, exportación, clic derecho, cards + 3 puntos) |
| 4. Modal de tipos del periodo | **Hecha** (tabla de conceptos, clic derecho Ver/Editar/Eliminar; fijos sin eliminar) |
| 5. Formulario de adicional, destinos y fijos | **Hecha** (simple/avanzado, montos/meses general/por grado, día de pago, Destinos con Avanzado tipo Estadísticas) |
| 6. Caja `/pagos` | **Hecha** (Tipo/Concepto, filtro Tipo, otros conceptos) |
| 7. Cartera, analítica, recibos, liberación y portal | **Hecha** (conceptos vencidos, tipos bloqueantes, portal con pestañas/combobox, comprobante por obligación) |
| 7.1 Portal del padre — pagos | **Hecha** |
| 8. Pruebas e2e | **Hecha**: `tipos-pagos` 6/6, `portal-padre` 6/6, `liberacion` 6/6, `configuracion-pagos`/`pagos`/`recibo-camara` PASS |
| 9. Verificación | **Hecha** (`tsc`, `eslint`, `build`) |
| 10. Documentación | **Hecha** MAPA; API_CLIENTES en backend |

Faltantes conscientes: los e2e comparten `molde_test` (correr `configuracion-pagos` y `liberacion` en la misma tanda altera montos); fallos preexistentes de `recibos`/`caja-cartera` por selector `.sidebar-nav` duplicado.

## Fase 1: Contratos, servicios, adaptadores y estado

- [ ] 1.1 Revisar y fijar el contrato reconciliado de backend 016 en `src/services/pagos.ts`, `pagos-config.ts`, `pagos-tipos.ts`, `calificaciones.ts` y `portal.ts`; evitar duplicar `TipoPagoGrupo`/`BloqueoNota` y dejar comentarios de mapeo.
- [ ] 1.2 Extender `src/services/pagos-config.ts` con `MesCobro`, `MesesCobroConfig` (`modo`, `anio_lectivo`, `rango`, `seleccionados`, `opciones`) y `ConfiguracionPagosUpdate` con `meses_modo?: 'auto' | 'manual'` y `meses?: MesCobro[]`, conservando los campos actuales.
- [ ] 1.3 Adaptar en `helpers/configuracion-pagos.ts` la respuesta `meses` del backend a opciones de UI (`del_periodo` → `en_periodo`, `seleccionado` → `configurado`), con fallback a 12 meses de `anio_lectivo` y soporte de 24 si el periodo cruza año.
- [ ] 1.4 Crear `src/services/pagos-tipos.ts` con las rutas exactas de backend 016: `GET /pagos/tipos-pago`, `GET /pagos/tipos-pago/opciones`, `GET /pagos/tipos-pago/{periodo_id}`, `POST /pagos/tipos-pago/{periodo_id}`, `PUT /pagos/tipos-pago/{periodo_id}/{tipo_id}` y `DELETE /pagos/tipos-pago/{periodo_id}/{tipo_id}`.
- [ ] 1.5 Definir tipos de respuesta del backend (`TiposPagoPeriodoBackend`, `TipoPagoDetalleBackend`, `EditablesTipoPago`, `ResumenTipoPago`) y el adaptador a `TiposPeriodoResponse`/`TipoPagoPeriodo` de UI, agrupando `fijos` y `adicionales` por `es_fijo`.
- [ ] 1.6 Adaptar reglas de destino: backend usa campos singulares (`alumno_id`, `curso_id`) y la UI usa arreglos (`alumno_ids`, `curso_ids`); implementar conversión bidireccional, deduplicación y descarte de reglas vacías.
- [ ] 1.7 Extender `src/services/pagos.ts` con `ObligacionFila` mapeando `tipo_codigo`, `tipo_nombre`, `tipo`, `es_mensualidad`, `etiqueta`, `mora_monto` y `total`; mantener el alias `MensualidadFila` para no romper imports existentes.
- [ ] 1.8 Extender los tipos de cartera, analítica, recibos, liberación y portal con los campos que sí expone backend 016 (`obligaciones_vencidas`, `conceptos_pendientes`, `tipos_bloqueantes`, campos opcionales de tipo) y adaptadores tolerantes a ausencia; el frontend no calcula bloqueos.
- [ ] 1.9 Crear `src/helpers/tipos-pago.ts` con `etiquetaTipoPago`, `reglaDestinoLabel`, `claveRegla`, `normalizarReglas`, `periodicidadLabel`, `validarTipoAdicional`, `reglasToPayload` y utilidades de etiquetas de meses.
- [ ] 1.10 Centralizar query keys y el helper `invalidarPagos(qc, periodoId)` con las invalidaciones de §7 (caja, cartera, analítica, recibos, liberación y portal); usarlo en configuración, tipos y cobro.
- [ ] 1.11 Garantizar degradación segura: `retry: false` en tipos/opciones, campos nuevos opcionales, estados vacíos ante `404`/`501` del backend 016 y ninguna llamada a `/catalogos/*`.

## Fase 2: Configuración de pagos — selector de meses

- [ ] 2.1 Crear `src/components/pagos/MesesCobro.tsx` con checkboxes de enero a diciembre (12) y, si el periodo cruza año, 12 adicionales del año siguiente; etiquetas con año, `data-testid="pagos-config-meses"` y `pagos-config-mes-${anio}-${mes}`.
- [ ] 2.2 Precargar por defecto los meses del periodo (`del_periodo`/`seleccionado` del backend o selección guardada); permitir marcar hasta 12 o 24 meses aunque el periodo dure menos y no limitar a la duración del periodo.
- [ ] 2.3 Insertar la sección «Meses que se cobran» en `ConfiguracionPagosModal.tsx` entre «Vencimientos» y «Mensualidad, matrícula y reglas de mora», con el título y el texto de ayuda del plan.
- [ ] 2.4 Agregar `meses` al estado de `ConfiguracionPagosForm`; actualizar `configToForm` y `formToPayload` para enviar `meses_modo: 'manual'` y `meses: [{ anio, mes }]` cuando el usuario cambió la selección.
- [ ] 2.5 Implementar `validarConfiguracion`: si `meses.length === 0`, mostrar «Marca al menos un mes.» y deshabilitar Guardar.
- [ ] 2.6 Incluir meses en `dirty` y en el reset del formulario; no marcar cambios si la selección no cambió; conservar compatibilidad con periodos sin meses persistidos.
- [ ] 2.7 Mostrar el estado de cada mes: badge «Con pagos»/conflicto cuando el backend lo exponga o cuando el `409` devuelva meses en conflicto; no inferir pagos localmente ni deshabilitar por datos no recibidos.
- [ ] 2.8 Actualizar el diálogo retroactivo solo cuando cambiaron los meses: explicar que los meses quitados inactivan obligaciones pendientes o en mora y que los meses con pagos bloquean el cambio (`409`).
- [ ] 2.9 Al guardar, mostrar toast de éxito y agregar los conteos de `obligaciones_inactivadas`/`obligaciones_creadas` si el backend los devuelve; invalidar `pagos-config`, `pagos-config-periodos`, `pagos-tipos` y el helper `invalidarPagos`.
- [ ] 2.10 Manejar el `409` de mes con pagos: toast con mensaje del backend, mantener modal y cambios, refrescar la query y no cerrar; manejar error de red con `userMessageFromError`.
- [ ] 2.11 Verificar responsive: una columna en móvil, sin desbordes, sin degradados y con tokens existentes.

## Fase 3: Página `/tipos-pagos`

- [ ] 3.1 Crear `src/routes/_app/tipos-pagos.tsx` con `RequirePermission permission="pagos_config:get"` y la query de periodos compartida; definir la key para no duplicar caché con `/configuracion-pagos` (adaptando la key si backend usa `/tipos-pago`).
- [ ] 3.2 Configurar `DataTable` con título «Tipos pagos», buscador automático «Buscar…», `canAdd={false}`, sin `onAdd`/«Agregar periodo» y `exportFilename="tipos-pagos"`.
- [ ] 3.3 Columnas: Periodo, Año lectivo, Estado (badge con `periodoEstadoPalabra`), Tipos y Meses. Usar los conteos del backend (`tipos_total`, `tipos_adicionales`) y chips de meses derivados de `meses_cobro`/`meses_modo`; si el backend agrega `meses[]` o `tipos_resumen`, mostrar chips detallados sin cambiar la estructura.
- [ ] 3.4 Filtros Año y Estado con `getLabel` humano; `searchText` incluye periodo, tipos y meses; exportación incluye periodo, año, estado, tipos y meses.
- [ ] 3.5 Abrir el modal con clic derecho → «Ver» (`tipos-pagos-ctx-ver-${id}`) y con doble clic en la fila.
- [ ] 3.6 Agregar acción «Ver» en escritorio (`tipos-pagos-btn-${id}`) y `data-testid="tipos-pagos-page"`; no agregar acciones de edición/eliminación en la tabla.
- [ ] 3.7 Implementar vista móvil con card y `RowMenu` de 3 puntos (`tipos-pagos-card-${id}`, `tipos-pagos-row-ver-${id}`), con las mismas acciones.
- [ ] 3.8 Estado vacío «No hay periodos», sin botón de agregar; manejar error de carga con reintento.
- [ ] 3.9 Agregar el ítem «Tipos pagos» en `src/helpers/nav.ts` (`pagos_config:get`, icono `receipt`) y descripción/palabras clave en `src/helpers/command-palette.ts`; no agregar comando «Agregar».
- [ ] 3.10 Verificar que `routeTree.gen.ts` se genere por dev/build y no editarlo a mano; revisar accesibilidad de la fila y los `data-testid`.

## Fase 4: Modal de tipos del periodo

- [ ] 4.1 Crear `TiposPagoPeriodoModal.tsx` con `Modal xl`, `testId="tipos-pago-modal"`, título «Tipos de pago · <periodo>» y query `['pagos-tipos', periodo.id]` con `enabled` y `retry: false`.
- [ ] 4.2 Cabecera de contexto: periodo, año lectivo, día de pago, meses configurados (`meses.seleccionados` del backend) y aviso si no hay configuración de pagos.
- [ ] 4.3 Renderizar estados de carga («Cargando tipos de pago…»), error con «Reintentar» y vacío/`404` («La administración de tipos aún no está disponible»); no romper la página.
- [ ] 4.4 Separar `tipos[]` del backend en «Pagos fijos» y «Tipos adicionales» usando `es_fijo`; no esperar `fijos`/`adicionales` en la respuesta.
- [ ] 4.5 En fijos, mostrar tarjeta de Mensualidad y Matrícula con badges Fijo/Periódico/Único y `BloqueaNotasBadge`; monto «Monto por grado» o monto recibido; enlace «El monto se edita en Configuración de pagos».
- [ ] 4.6 En Mensualidad, acción «Editar meses y bloqueo»; en Matrícula, solo «Editar bloqueo»; no mostrar «Eliminar» en fijos y respetar `editables`.
- [ ] 4.7 Implementar «Agregar tipo» dentro del modal, solo con `pagos_config:put`; estado vacío «Aún no hay tipos adicionales».
- [ ] 4.8 Listar adicionales con nombre, descripción, monto, badge Periódico/Único, `BloqueaNotasBadge`, resumen de reglas (`reglaDestinoLabel`) y meses o fecha de vencimiento.
- [ ] 4.9 Acciones Editar y Eliminar por adicional, solo con `pagos_config:put`; Eliminar con `ConfirmDialog danger`, mensaje de «solo sin obligaciones» y `testId="tipos-pago-confirmar-eliminar"`.
- [ ] 4.10 Al eliminar, llamar `DELETE /pagos/tipos-pago/{periodo_id}/{tipo_id}`; success toast «Tipo de pago eliminado»; `409` con mensaje del backend y el tipo permanece.
- [ ] 4.11 Tras crear/editar/eliminar o editar fijo, refrescar `['pagos-tipos', periodo.id]` y ejecutar `invalidarPagos`; mantener el modal abierto.
- [ ] 4.12 Crear `BloqueaNotasBadge.tsx` con «Bloquea notas»/«No bloquea notas», usando tokens; si `bloquea_notas` falta en un tipo existente, mostrar «Bloquea notas» solo como badge, sin inventar lógica.
- [ ] 4.13 Verificar responsive del modal: contenido apilado, árbol con scroll, resumen debajo, sin degradados.

## Fase 5: Formulario de tipo adicional, destinos, bloqueo y edición de fijos

- [ ] 5.1 Crear `TipoPagoAdicionalModal.tsx` con `Modal xl`, títulos «Nuevo tipo de pago»/«Editar tipo de pago» y secciones Datos, Bloqueo de notas y Destinos.
- [ ] 5.2 Datos: Nombre requerido, Descripción, Monto (L) numérico ≥ 0 y segmentado Periódico/Único (`role="radiogroup"`, periódico por defecto).
- [ ] 5.3 Si es Periódico, mostrar solo lectura «Meses: <meses del periodo>» y bloquear guardar si el periodo no tiene meses configurados; no repetir el selector de meses.
- [ ] 5.4 Si es Único, mostrar Fecha de vencimiento requerida (`type="date"`) y precargar la fecha sugerida si backend/helper la provee; si no, derivarla del día de pago solo como ayuda visual.
- [ ] 5.5 Toggle «Bloquea notas» **activo por defecto al crear** y con el valor del backend al editar; texto de ayuda que aclara que el backend decide el bloqueo y el frontend solo guarda el flag.
- [ ] 5.6 Crear `DestinosTipoPago.tsx` con tabs Modalidad/Grado/Sección/Avanzado y opciones desde `GET /pagos/tipos-pago/opciones?periodo_id=`; prohibido usar `/catalogos/*`.
- [ ] 5.7 Implementar selección por modalidad, grado y sección: cada opción agrega una regla, se puede quitar desde el resumen y se evitan duplicados exactos.
- [ ] 5.8 Implementar Avanzado: grado/sección expandibles, cursos de todo el grado, cursos de sección y alumnos de sección; `SearchInput` con «Buscar…» y estados `incluida`/deshabilitado para lo ya cubierto.
- [ ] 5.9 Mostrar resumen: sin reglas «Todos los alumnos del periodo»; con reglas `N regla(s)` y lista con `reglaDestinoLabel`; OR entre reglas y AND dentro de cada regla; descartar reglas vacías al guardar.
- [ ] 5.10 No borrar reglas automáticamente al cambiar modalidad/grado/sección; solo quitarlas por acción del usuario; no mostrar alumnos estimados si el backend no los devuelve.
- [ ] 5.11 Implementar `validarTipoAdicional` (nombre, monto, meses para periódico, fecha para único) con errores inline y guardar deshabilitado.
- [ ] 5.12 Guardar con `ConfirmDialog` de resumen (nombre, periodicidad, monto), `POST`/`PUT` a las rutas backend y toast «Tipo de pago creado/actualizado»; cerrar solo el formulario y refrescar el modal padre.
- [ ] 5.13 Crear `TipoPagoFijoModal.tsx` para Mensualidad: `MesesCobro` + toggle `bloquea_notas`, validar al menos un mes, guardar meses mediante `PUT /pagos/configuracion/{periodo_id}` (`meses_modo: 'manual'`) y el flag mediante `PUT /pagos/tipos-pago/{periodo_id}/{tipo_id}`.
- [ ] 5.14 En Matrícula, no mostrar meses; solo toggle `bloquea_notas`, texto de pago único y enlace a Configuración de pagos; guardar solo el flag con la ruta de tipos.
- [ ] 5.15 Respetar `editables`: no permitir cambiar nombre, monto ni periodicidad de fijos; manejar el `400` del backend con mensaje claro.
- [ ] 5.16 Verificar testids y responsive del formulario y del árbol; sin estilos nuevos ni degradados.

## Fase 6: Caja `/pagos`

- [ ] 6.1 Adaptar `listMensualidades()` al shape de `ObligacionFila`, incluyendo matrícula y adicionales; no cambiar `POST /pagos/cobro` ni el flujo por `obligacion_pago_ids`.
- [ ] 6.2 Agregar columna «Tipo» con `tipo_nombre`/badge (`pago-tipo-<obligacion_id>`) y «Concepto» usando `etiqueta`; mantener la columna «Mes» con `id: 'mes'` y su `getValue` por etiqueta para no romper filtros.
- [ ] 6.3 Mostrar monto `total ?? monto` y conservar Vence, Estado y Pagado el; ajustar la exportación con tipo y concepto.
- [ ] 6.4 Agregar filtro «Tipo» (`tipo`/`tipo_pago_id`) y opción «Sin mes» en el filtro Mes para únicos; `searchText` incluye alumno, código, grado, sección, tipo y etiqueta.
- [ ] 6.5 Menú contextual: «Ver» para todos; «Editar» y «Anular pago» solo para mensualidad (decisión conservadora aunque backend ya permita anular otros tipos); «Registrar pago» para cualquier obligación impaga.
- [ ] 6.6 En `RegistrarPagoModal`, usar `obligaciones ?? meses`, separar mensualidades de otros conceptos y mantener intacta la sección `.cobro-meses` con `pago-mes-<anio>-<mes>`.
- [ ] 6.7 Agregar sección «Matrícula y otros conceptos» (`pago-otros-conceptos`) solo si hay otros; filas con checkbox, etiqueta, estado, monto, vencimiento y `pago-obligacion-<id>`.
- [ ] 6.8 Renombrar la selección a `obligacionesSel`, sumar `total ?? monto`, ajustar el botón «Cobrar N concepto(s) · L total» y el `ConfirmDialog` con los conceptos.
- [ ] 6.9 Mantener `cobrarObligaciones` como alias de `cobrarMeses` para no cambiar el endpoint; ampliar `refrescarPagos` con el helper `invalidarPagos`.
- [ ] 6.10 En `DatosMensualidad`, agregar Tipo y Concepto; conservar «Anular» solo para mensualidades; no ofrecer edición/anulación de adicionales en esta versión.
- [ ] 6.11 Verificar que `?alumno=<código>`, `Toca pagar` y los flujos actuales sigan funcionando; matrícula/adicionales no rompen el cobro de mensualidades.

## Fase 7: Cartera, analítica, recibos, liberación y portal (visual)

- [ ] 7.1 Crear `ConceptosPendientes.tsx` y agregar la columna «Conceptos» en `/alumnos` y `/padres`.
- [ ] 7.2 Mostrar chips `Nombre · L monto` desde `tipos_pendientes` si el backend lo devuelve; si solo llega `obligaciones_vencidas`/`monto_vencido`, mostrar ese resumen sin deducir nombres de tipos; no inventar.
- [ ] 7.3 Mantener `EstadoPago` y `monto_vencido` basados en mensualidades; no cambiar el semáforo; agregar `conceptos` a `exportRows`.
- [ ] 7.4 En `/analitica-pagos`, mostrar los tipos en la tabla de morosos usando los conceptos que devuelve el backend; agregar tarjeta «Por tipo de pago» solo si `por_tipo` existe.
- [ ] 7.5 En la exportación de analítica, agregar hoja/sección «Por tipo» solo si hay `por_tipo`; no fabricar datos.
- [ ] 7.6 En `/recibos`, agregar columna/filtro Tipo solo si los campos vienen; mostrar el tipo en modo lectura en validación y no cambiar el body de `PUT /pagos/recibos/{id}/validar`.
- [ ] 7.7 En `/liberacion-notas`, adaptar `conceptos_pendientes`/`tipos_bloqueantes` a la UI: tipo + concepto/meses + badge «Bloquea notas»; si no vienen, usar `meses` como hoy.
- [ ] 7.8 Mostrar el bloque `liberacion-bloqueos` solo cuando el backend lo devuelva; actualizar el texto del modal de liberación sobre tipos adicionales; no calcular el bloqueo en frontend.
- [ ] 7.9 En portal (`PortalCalificacionesView`, resultados y vistas del hijo), mostrar `mensaje` del backend y chips con tipo/meses si llegan `conceptos_pendientes`, `tipos_bloqueantes` o `bloqueos`; nunca decidir el bloqueo localmente.
- [ ] 7.10 Verificar degradación: sin campos nuevos, `/alumnos`, `/padres`, `/analitica-pagos`, `/recibos`, `/liberacion-notas` y portal conservan el comportamiento actual.

## Fase 7.1: Portal del padre — pagos (`/hijo/pagos`)

- [ ] 7.1.1 Extender `src/services/portal.ts` con `ObligacionPortal` (`obligacion_pago_id`, `tipo_codigo`, `tipo_nombre`, `descripcion`, `periodo_label`, `anio`, `mes`, `monto`, `mora_monto`, `total`, `fecha_vencimiento`, `estado`, `bloquea_notas`, `puede_subir_recibo`, `recibo_estado`) y `PortalPagosResponse` con `obligaciones[]`, `total_pendiente`, `total_pagado`, `vencidos`, `monto_vencido`; conservar `meses[]` como fallback.
- [ ] 7.1.2 Crear `src/components/portal/PagoObligacionCard.tsx`: tipo, concepto, monto, mora, total, vencimiento, estado, badge «Bloquea notas» y botón «Subir comprobante» si `puede_subir_recibo`.
- [ ] 7.1.3 Actualizar `src/routes/_app/hijo/pagos.tsx` para listar todas las obligaciones (mensualidad, matrícula y adicionales), agrupando mensualidades por mes y mostrando matrícula/adicionales con su tipo; total pendiente y próximo pago con todos los tipos.
- [ ] 7.1.4 Adaptar el modal de subida de comprobante para enviar `obligacion_pago_id`; mantener `{alumno_id, anio, mes}` solo como fallback para mensualidades. Mostrar «En revisión» si `recibo_estado='sin_revisar'` y permitir reintentar si fue denegado.
- [ ] 7.1.5 Mostrar el badge/mensaje de bloqueo de notas con el nombre del tipo si el backend lo devuelve; no calcular el bloqueo en el frontend.
- [ ] 7.1.6 Invalidar `['portal-pagos']`, `['portal-calificaciones']`, `['portal-resumen']`, `['resultado-periodo']` y las queries de recibos/caja tras subir o validar un comprobante.
- [ ] 7.1.7 Degradación: si `obligaciones[]` no viene, `/hijo/pagos` sigue mostrando `meses[]` como hoy; si `bloquea_notas` no viene, ocultar el badge.

## Fase 8: Pruebas e2e

- [ ] 8.1 Crear `src/tests/e2e/tipos-pagos.spec.ts` con usuarios de fixture y marcar `@backend-016` si la API aún no está desplegada.
- [ ] 8.2 E2E página/permisos: título, buscador «Buscar…», filtros Año/Estado, sin «Agregar periodo», chips/conteos y meses.
- [ ] 8.3 E2E clic derecho «Ver» y doble clic abren `tipos-pago-modal`; cierre correcto.
- [ ] 8.4 E2E móvil `<768px`: card, `RowMenu` y «Ver».
- [ ] 8.5 E2E crear adicional periódico con `bloquea_notas` activo por defecto y destino por modalidad; verificar badges.
- [ ] 8.6 E2E persistencia y edición: reabrir modal, cambiar monto/descripción y verificar.
- [ ] 8.7 E2E destinos OR/AND: grado + sección, sin reglas = todos, avanzado con curso/alumno y resumen.
- [ ] 8.8 E2E tipo único: fecha de vencimiento visible/precargada, guardar y badge Único.
- [ ] 8.9 E2E `bloquea_notas`: activo por defecto, desmarcar y verificar «No bloquea notas» en la lista.
- [ ] 8.10 E2E editar Mensualidad (meses + bloqueo) y Matrícula (solo bloqueo + enlace a configuración).
- [ ] 8.11 E2E eliminar adicional con `ConfirmDialog danger`; caso con obligaciones devuelve error y no desaparece.
- [ ] 8.12 E2E meses en `/configuracion-pagos`: default del periodo, desmarcar todos → error/Guardar deshabilitado, marcar uno y persistir; texto retroactivo.
- [ ] 8.13 E2E mes con pagos: checkbox deshabilitado si el backend lo expone o `409` al intentar quitarlo, sin cerrar el modal.
- [ ] 8.14 E2E caja: columna/filtro Tipo, fila de matrícula/adicional, sección «Matrícula y otros conceptos» y cobro de una obligación adicional.
- [ ] 8.15 E2E bloqueo de notas: tipo adicional pendiente aparece en liberación/portal; tipo con `bloquea_notas=false` no bloquea; mensaje con nombre del tipo si el backend lo devuelve.
- [ ] 8.16 E2E roles: maestro sin `pagos_config:get` no ve el menú y recibe «No tienes permiso» al entrar por URL.
- [ ] 8.17 Regresión `configuracion-pagos.spec.ts` (días, montos, mora y testids actuales intactos).
- [ ] 8.18 Regresión `pagos.spec.ts` (tabla, Ver, Editar, Anular, Registrar pago, `pago-mes-*`).
- [ ] 8.19 Regresión `recibos.spec.ts` (validar y corrección de mes).
- [ ] 8.20 Regresión `liberacion.spec.ts` (parciales, bloqueados, forzar).
- [ ] 8.21 Regresión `analitica-pagos.spec.ts` (tarjetas, medidores, descargas; nueva tarjeta opcional).
- [ ] 8.22 Regresión `caja-cartera.spec.ts` (alumnos, padres, cobrar).
- [ ] 8.23 Recomendados: `portal.spec.ts`, `permisos.spec.ts`, `modulos.spec.ts`, `smoke.spec.ts`.
- [ ] 8.24 Crear `src/tests/e2e/portal-pagos.spec.ts`: el padre ve mensualidad, matrícula y adicional en `/hijo/pagos`, con tipo, monto, mora/total, vencimiento y badge de bloqueo.
- [ ] 8.25 E2E comprobante de matrícula/adicional: subir por `obligacion_pago_id`, ver «En revisión», caja lo aprueba en `/recibos` y la obligación pasa a pagada; denegar/revertir la devuelve a pendiente.
- [ ] 8.26 E2E bloqueo: un adicional `bloquea_notas=false` no oculta la nota; uno `true` impago bloquea el parcial y el mensaje muestra su nombre; al pagarlo se libera.

## Fase 9: Verificación

- [ ] 9.1 Ejecutar `pnpm exec tsc --noEmit` y corregir errores de tipos/adaptadores.
- [ ] 9.2 Ejecutar ESLint solo sobre archivos tocados (`pnpm exec eslint <rutas>`) y corregir.
- [ ] 9.3 Ejecutar `pnpm build`.
- [ ] 9.4 Ejecutar `pnpm exec playwright test src/tests/e2e/tipos-pagos.spec.ts`.
- [ ] 9.5 Ejecutar regresión Playwright: `configuracion-pagos`, `pagos`, `recibos`.
- [ ] 9.6 Ejecutar regresión Playwright: `liberacion`, `analitica-pagos`, `caja-cartera`.
- [ ] 9.7 Ejecutar `pnpm test:e2e:smoke` (y `pnpm check` si existe) y revisar responsive, ausencia de degradados y uso de tokens.
- [ ] 9.8 Reportar PASS/FAIL por comando, con nota de dependencia del backend 016 y sin declarar PASS si el spec quedó `@backend-016` sin ejecutar.

## Fase 10: Documentación pendiente (condicionada, no ejecutar ahora)

- [ ] 10.1 Preguntar antes de actualizar `documentacion/MAPA.md` (rutas, componentes y cambios de comportamiento); no editarlo en este paso.
- [ ] 10.2 Preguntar antes de actualizar `documentacion/API_CLIENTES.md` con las rutas de backend 016 y los adaptadores; no editarlo en este paso.
- [ ] 10.3 Preguntar antes de actualizar `documentacion/EVOLUCION.md` con la bitácora de la feature; no editarlo en este paso.
- [ ] 10.4 Confirmar si la documentación va en el mismo commit; sin aprobación, dejarla fuera.

---

## Criterios de aceptación

> Referencia del plan. No son tareas adicionales; sirven para cerrar la feature.

1. `/configuracion-pagos` muestra «Meses que se cobran» con los meses del periodo (y del año siguiente si cruza), preselecciona los meses del periodo y permite marcar/desmarcar.
2. No se puede guardar sin al menos un mes; el error es visible y el botón queda deshabilitado.
3. Si el periodo ya tenía configuración, el diálogo retroactivo explica la inactivación de pendientes/en mora y el bloqueo por pagos.
4. Los meses con pagos se muestran deshabilitados cuando el backend lo expone y no se pueden quitar; el backend rechaza el intento con `409` y un mensaje claro.
5. `/tipos-pagos` existe, usa `pagos_config:get`, muestra una fila por periodo, sin «Agregar periodo», con Periodo/Año/Estado/Tipos/Meses, filtros Año/Estado y exportación.
6. Clic derecho «Ver» y doble clic abren el modal; en móvil se usa el menú de 3 puntos.
7. El modal muestra «Pagos fijos» con Mensualidad y Matrícula, badges Fijo/Periódico/Único, sin eliminarlas, y enlace/indicación de que el monto se edita en Configuración de pagos.
8. La Mensualidad permite editar meses y bloqueo; la Matrícula solo bloqueo.
9. «Tipos adicionales» lista los tipos, permite «Agregar tipo», Editar y Eliminar con `ConfirmDialog danger`.
10. El formulario de adicional tiene nombre, descripción, monto, segmentado Periódico/Único, «Bloquea notas» activo por defecto y destinos con tabs Modalidad/Grado/Sección/Avanzado.
11. Sin reglas = todos; varias reglas = OR; dentro de una regla los campos son AND; avanzado permite cursos/alumnos específicos; el resumen refleja las reglas.
12. Periódico usa los meses del periodo; único muestra «Fecha de vencimiento» con la fecha sugerida o derivada del día de pago.
13. La lista/modal muestra badge «Bloquea notas»/«No bloquea notas» y el toggle se puede cambiar en fijos y adicionales.
14. `/pagos` muestra mensualidad, matrícula y adicionales con columna y filtro «Tipo»; se pueden cobrar por obligación y el flujo de mensualidades sigue igual.
15. Cartera y analítica muestran los conceptos/tipos pendientes que devuelve el backend (`/alumnos`, `/padres`, `/analitica-pagos`), sin degradados y sin cambiar el semáforo basado en mensualidades.
16. `/liberacion-notas` y el portal muestran el bloqueo con el nombre del tipo cuando el backend lo devuelve; no se inventa lógica de bloqueo en el frontend.
16.1. `/hijo/pagos` lista mensualidad, matrícula y adicionales con tipo, monto, mora/total, vencimiento, estado y badge «Bloquea notas»; los totales incluyen todos los tipos.
16.2. El padre puede subir comprobante por `obligacion_pago_id` para matrícula/adicional; caja lo valida y la obligación correcta cambia de estado. Los comprobantes de mensualidad siguen funcionando con `{anio, mes}`.
17. `nav.ts` y el command palette incluyen «Tipos pagos»; no se crea permiso nuevo ni se toca `ROLE_PERMISSIONS`.
18. Las opciones de destino se piden bajo `pagos_config:get` con `GET /pagos/tipos-pago/opciones`, nunca con `catalogos:get`.
19. Los e2e nuevos y la regresión de `configuracion-pagos`, `pagos`, `recibos`, `liberacion`, `analitica-pagos` y `caja-cartera` pasan; `tsc --noEmit`, ESLint de archivos tocados y `build` sin errores.
20. Sin backend 016, las pantallas actuales siguen funcionando; los campos nuevos se degradan a vacío/oculto sin romper.

---

## Riesgos y casos borde

> Referencia del plan. No son tareas adicionales.

### Riesgos

- **Contrato de meses ambiguo:** backend 016 usa `meses_modo` + `meses` y un objeto `meses` en la respuesta; el plan frontend esperaba arreglos y campos de UI. Mitigación: un solo adaptador en `helpers/configuracion-pagos.ts`.
- **Doble fuente para meses:** `PUT /pagos/configuracion/{id}` y la edición de Mensualidad deben tocar el mismo dato. Mitigación: invalidar `pagos-config`, `pagos-tipos`, `pagos-config-periodos` y caja tras guardar.
- **Semántica de `bloquea_notas`:** si el backend no la implementa, la UI parecerá configurar algo que no bloquea. Mitigación: la UI solo guarda y pinta; los tests de liberación deben cubrir adicionales.
- **Regresiones en `/pagos`:** cambiar `MensualidadFila` a `ObligacionFila` toca tabla, filtros, exportación y modales. Mitigación: alias de tipo, conservar `pago-mes-*` y correr `pagos.spec.ts` antes de ampliar.
- **Anulación/edición de tipos no mensuales:** backend 016 ya anula cualquier obligación, pero el plan frontend solo ofrecía mensualidades. Mitigación: mantener la UI conservadora en esta versión y no asumir un `400`.
- **N+1 en `/tipos-pagos`:** pedir tipos por fila sería lento. Mitigación: usar los conteos del listado y pedir el detalle solo al abrir el modal.
- **Opciones de destino grandes:** muchos alumnos/cursos pueden hacer pesado el árbol. Mitigación: endpoint acotado al periodo, búsqueda «Buscar…» y scroll dentro del modal.
- **Permisos:** contabilidad no tiene catálogos; cualquier intento de reutilizar `/catalogos/*` fallará. Mitigación: un único endpoint de opciones bajo `pagos_config:get`.
- **Caché:** guardar tipos/meses debe invalidar caja, cartera, analítica, recibos, liberación y portal; si falta una key, la UI muestra datos viejos. Mitigación: helper `invalidarPagos`.
- **Datos históricos:** eliminar un tipo no debe borrar obligaciones/pagos. Mitigación: backend `409` si hay pagos; el frontend no borra localmente hasta confirmar respuesta.
- **Accesibilidad/móvil:** árboles anidados y modales grandes. Mitigación: reutilizar patrones de `CoordinacionWizard` y `TipoFichaModal`; probar en `< 768px`.
- **Divergencias de respuesta (cartera, analítica, liberación y portal):** backend 016 no garantiza `tipos_pendientes`, `por_tipo` ni `bloqueos[]` con los nombres del plan frontend. Mitigación: adaptadores tolerantes y ocultar/omitir lo que no venga, sin inventar.

### Casos borde

- Sin periodos: `/tipos-pagos` muestra `empty-state` «No hay periodos»; no hay «Agregar».
- Periodo sin configuración: el modal muestra fijos con el aviso de que los montos se editan en Configuración de pagos; los periódicos exigen meses configurados.
- Sin meses seleccionados: error inline «Marca al menos un mes.» y Guardar deshabilitado.
- Periodo cruza año: se muestran 12 meses del año inicial y 12 del siguiente; las etiquetas incluyen el año.
- Mes con pagos: deshabilitado si el backend lo expone; si no, `409` con toast y el modal no se cierra.
- Mes con pendientes que se desmarca: aviso inline y párrafo en el diálogo retroactivo; el backend inactiva pendientes/en mora y no borra pagos.
- Retroactivo falla: el modal permanece abierto, se conserva el formulario y se muestra `userMessageFromError`.
- Dos usuarios guardan a la vez: el backend gana; al recargar se ve el estado real; invalidar caché tras conflicto.
- Tipo adicional duplicado: `400`/`409` del backend; error inline/toast con su mensaje; no inventar nombre único en el frontend.
- Monto negativo o vacío: validación `≥ 0`; si no es numérico, error.
- Tipo periódico sin meses configurados: formulario bloqueado con mensaje; no se puede guardar.
- Tipo único sin fecha: error inline; no se puede guardar.
- Fecha de vencimiento anterior a hoy: la UI no la corrige; el backend valida y devuelve el mensaje.
- Eliminar adicional con obligaciones: backend `409`; el `ConfirmDialog` ya advirtió y el tipo no desaparece.
- Editar tipo con obligaciones: el backend decide si recalcula o rechaza; la UI muestra el error/aviso y no reescribe pagos.
- Reglas vacías: se descartan al guardar; si todas quedan vacías, el tipo aplica a todos.
- Reglas solapadas: backend usa OR y deduplica; la UI evita duplicados exactos y marca lo incluido.
- Modalidad/grado/sección sin opciones: `empty-state` «No hay opciones para este periodo».
- Alumno sin matrícula activa: no aparece en opciones; el backend lo omite.
- Contabilidad sin `catalogos:get`: nunca se llama a `/catalogos/*`; si falla el endpoint de opciones, se muestra error y no se cae a catálogos.
- Backend 016 no desplegado: `404` en tipos → modal con estado vacío y aviso; `/pagos` y `/configuracion-pagos` siguen funcionando con los campos actuales.
- `bloquea_notas` ausente: badge por defecto «Bloquea notas» solo en tipos existentes; no se inventa bloqueo en liberación.
- Caja con matrícula/adicionales: «Ver» y «Registrar pago» para todos; edición/anulación solo mensualidades en esta versión.
- Móvil: `DataTable` con card + `RowMenu`; el modal conserva `useDismiss` y no pierde cambios al rotar.
- Error de red: `toast.error(userMessageFromError(e))`; no se pierde el borrador salvo tras un guardado exitoso.

---

## Resumen de fases

| Fase | Tareas |
|---|---:|
| 1. Contratos, servicios, adaptadores y estado | 11 |
| 2. Configuración de pagos — meses | 11 |
| 3. Página `/tipos-pagos` | 10 |
| 4. Modal de tipos del periodo | 13 |
| 5. Formulario de adicional, destinos y fijos | 16 |
| 6. Caja `/pagos` | 11 |
| 7. Cartera, analítica, recibos, liberación y portal | 10 |
| 8. Pruebas e2e | 23 |
| 9. Verificación | 8 |
| 10. Documentación condicionada | 4 |
| **Total** | **117** |
