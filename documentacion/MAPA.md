# Mapa del frontend Sasha

Lectura rápida de qué hay y qué hace. Bitácora de cambios: [`EVOLUCION.md`](EVOLUCION.md). Contrato HTTP: [`API_CLIENTES.md`](API_CLIENTES.md).

## Capas

- `src/routes/` — pantallas (TanStack Router). `_app` exige sesión.
- `src/services/` — llamadas al API (`/api` → backend en local).
- `src/components/` — UI reutilizable y wizards.
- `src/helpers/` — menú (`nav.ts`) y matriz de permisos (`permissions.ts`).
- `src/lib/` — cliente HTTP, sesión en `localStorage`.
- `src/styles/app.css` — tokens Sasha, BEM, sin degradados.

Permisos: el menú y `Can` / `RequirePermission` filtran por rol. El API también valida.

## Rutas

| Ruta | Qué hace |
|------|----------|
| `/login` | Código + contraseña. Sin selector de rol. Maestro → `/maestro`; alumno → `/alumno`; responsable → `/responsable`; resto → `/dashboard`. |
| `/dashboard` | Inicio autenticado (roles staff). Arriba muestra el **banner** activo en grande (`AvisoBanner`). Alumno y responsable son redirigidos a su portal. |
| `/alumno/resultados` | **Calificaciones / Resultado general** (alumno, o responsable con hijo elegido; sin hijo → `/responsable`). **Sin sidebar.** Arriba: promedio general (anillo, aviso si hay parciales ocultos por pago), card **«¿Cómo va?»** (mejoró / bajó su promedio / se mantuvo: de X en un parcial a Y en el siguiente, cuántas materias subieron y bajaron; sin dos parciales con nota lo dice) y cuadro. Al bajar: **un bloque por parcial, del más reciente al primero** («III parcial», «II parcial»…) con su promedio y flecha, aprobadas/reprobadas y cada materia con **termómetro** (barra que se llena hasta la nota sobre 100; roja si reprueba), la nota y una **flecha** verde ↑ / roja ↓ con los puntos de diferencia frente al parcial anterior (nada si quedó igual o es el primero). Primero van las materias con nota. Parcial bloqueado por pago: candado + mensaje. Los no liberados salen en una línea final «Aún no liberados: …». Debajo de las barras de cada parcial visible van **dos tarjetas de análisis**: «Oportunidades de mejora» (`resultado-parcial-{n}-mejorar`) y «En qué destaca» (`resultado-parcial-{n}-destaca`), con textos fijos por grupo (tareas en casa, trabajo en clase, exámenes y pruebas, labor social, asistencia). Los mensajes urgentes llevan ícono de alerta y borde rojo; tarjeta vacía: «Sin observaciones en este parcial.» Nunca se muestran porcentajes ni umbrales. Datos: `GET /portal/resumen` (`parciales[]` con `analisis`, `tendencia`). Responsable: barra «Atrás» → `/alumno`; alumno: «Volver al inicio». |
| `/responsable` | **Selector de hijo** del responsable: banner + una card por alumno a cargo con foto (o inicial si no hay), nombre completo, n.º de cuenta y grado/sección (`GET /portal/hijos`). **Sin sidebar.** Siempre se muestra, aunque haya un solo hijo. Clic en la card guarda el hijo (`sessionStorage` `sasha.portal.alumnoId`) y va a `/alumno`; ahí el responsable no ve el banner otra vez y tiene el botón «Mis alumnos» / «Cambiar alumno» para volver. El botón **Inicio** de la barra superior siempre lleva al responsable aquí. |
| `/hijo/tareas` | Portal del padre (estilo app, `PadreScreen`: barra «Atrás» grande → `/alumno`). **Todas las tareas** del hijo juntas (`GET /portal/tareas`): «Pendientes» (entrega más próxima primero) y «Revisadas», con materia y «Entrega: Hoy / Mañana / fecha». Estado Pendiente / Atrasada / Revisada. **Nunca muestra puntos obtenidos.** |
| `/hijo/horario` | Pestañas Lun–Vie (abre en el día de hoy) y lista de clases del día con hora y fila «Recreo» (`GET /portal/inicio`). |
| `/hijo/plan` | Lista de materias → `/hijo/plan/$asignacionId`, que muestra `PortalPlanView` sin título (pensum, plan activo y PDF). «Atrás» vuelve a la lista. |
| `/hijo/pagos` | Botón grande fijo **«Subir recibo de pago»** (desactivado si no hay meses por pagar), card de pagos atrasados (meses y monto), «Próximo pago» (mes, monto, fecha límite) o «Todo al día», lista de mensualidades (Pagado / Recibo en revisión / Debe / Recibo denegado / Pendiente) y «Recibos enviados» con el motivo si fue denegado (`GET /portal/pagos`). El modal `SubirReciboModal` permite **Tomar foto** (en celular abre la cámara nativa; en escritorio pide permiso y muestra la cámara en vivo con **Capturar**/Cancelar y un select **Cámara** si hay más de una; requiere localhost o HTTPS) o **Elegir archivo** (imagen o PDF, máx. 10 MB), con vista previa, y pregunta **«¿De qué mes es?»** (solo meses sin pagar y sin recibo en revisión; propone el primer vencido o el próximo). Confirma y manda `POST /portal/recibos`. |
| `/recibos` | **Caja** (`pagos:put`, en la sidebar como «Recibos»). DataTable de recibos de los padres: enviado, padre, alumno + código, mes, cantidad, fecha de pago y estado (Sin revisar / Aprobado / Denegado), con filtros por estado y mes y exportación (`GET /pagos/recibos`). Clic derecho: **Ver** (visor de imagen/PDF + datos) y **Validar**: visor al lado de un formulario con select de estado, mes y año (avisa «Se corregirá el mes: X → Y»), cantidad, fecha de pago y observaciones (el padre las ve si se deniega). Guardar confirma (`PUT /pagos/recibos/{id}/validar`); cancelar con cambios pide confirmación. Si el archivo no existe, el visor lo dice. |
| `/alumno` (responsable) | **Inicio del hijo estilo app** (`HijoHub`, pensado para celular): foto, nombre, grado · sección, n.º de cuenta y «Mis alumnos» / «Cambiar alumno». Debajo, **5 botones grandes**: Tareas (badge con las de hoy/mañana) → `/hijo/tareas`, Horario → `/hijo/horario`, Plan de estudio → `/hijo/plan`, Pagos (en rojo con «Debe N meses» o «Próximo: …») → `/hijo/pagos` y Calificaciones → `/alumno/resultados`. Una columna en celular, dos desde 720 px. |
| `/alumno` | **Inicio del portal** (vista del alumno; el responsable ve `HijoHub`, fila anterior). **Sin sidebar.** Horario semanal completo con fila «Recreo» (`AlumnoHorarioView`) + cards de clases (solo las que tienen bloques en el horario activo) con badge `T{n}` = tareas sin revisar que vencen **hoy o mañana**, y la línea «Tarea hoy: n · Mañana: m» (`GET /portal/inicio`). Entre el horario y las clases va **Resultado general** (`GET /portal/resumen`): anillo con el promedio de todas las materias con parciales liberados, el cuadro (excelencia, honor, aprobado, reprobado) y «Ver más» → `/alumno/resultados`. Sin notas liberadas: «Aún no hay calificaciones liberadas». Banner solo para alumno (el responsable ya lo vio en `/responsable`). Responsable: botón «Mis alumnos» (1 hijo) o «Cambiar alumno» (2+) → `/responsable`. Click en card → **modo clase** (`sessionStorage` `sasha.portal.clase`) y abre `/tareas`. |
| `/maestro` | **Hub del maestro** tras login: banner activo arriba (`AvisoBanner`), cards + horario abajo. **Sin sidebar.** Menú ⋮: Ver / Pasar lista / Agregar tarea (modales). **Ir** → dashboard de clase. Top **Inicio** / marca **Sasha** vuelven aquí. |
| `/maestro/clases/$asignacionId` | **Dashboard asistente** (bento): Ahora (slot), Notas (tarjetas + Nueva), Alumnos (pastilla Pendiente/Incompleta/Lista + ratio marcas/total + Pasar lista), Tareas a revisar hoy (⋮ Revisar), y abajo a todo el ancho **Plan de esta semana**: barra de progreso tipo termómetro (iniciado = mitad del ítem, finalizado = ítem completo) + tarjetas (título, descripción, fechas, pts, materiales) con ⋮ para cambiar cumplimiento (`PUT /planestudio/cumplimiento/{id}`). Drawer de notas a la derecha (Markdown TipTap; guarda al cerrar / Listo; TTL 14 días). Sidebar: ítem Dashboard. |
| `/mi-perfil` | **Sin sidebar** (como los hubs). Carnet a la izquierda: foto (clic para subir/cambiar, bóveda), nombre completo, código, usuario, rol y botón **Cambiar contraseña** que abre un modal. A la derecha el expediente por rol (`GET /personas/mi-ficha`): **Datos personales** para todos; alumno: **Matrícula** (grado, sección, jornada, periodo, ingreso), **Responsables** (parentesco, principal) y **Salud e intereses**; padre: **Hogar y trabajo** y **Alumnos a cargo**; maestro: **Carga académica** (materias, grupos, horas por semana, días y grupos por materia). |
| `/configuracion` | Nombre institución, código SACE, umbrales de nota. |
| `/catalogos/grados` | CRUD grados. |
| `/catalogos/modalidades` | CRUD turnos (horarios, recreos, parciales). |
| `/catalogos/secciones` | CRUD secciones (grado + modalidad). |
| `/catalogos/cursos` | CRUD cursos con sílabo (requisitos, horas, objetivos, competencias, estrategias, evaluación, recursos, bibliografía). Menú: Ver (maestros asignados + PDF), Asignar maestro (curso fijo), Editar, Eliminar. |
| `/catalogos/periodos` | CRUD periodos lectivos. Solo uno puede estar **activo**; al activar otro, el anterior pasa a inactivo. Menú de fila **Parciales** (`ParcialesPeriodoModal`): tabla de parciales y alta o edición con número, nombre, inicio y fin. Muestra en vivo los meses que abarca, que son los que cuentan para liberar notas (`POST /catalogos/periodos/{id}/parciales`, `PUT /catalogos/parciales/{id}`). |
| `/usuarios` | Alta/edición de usuarios; al crear alumno/maestro/responsable también crea el perfil. DataTable: Descargar (Excel/PDF), menú Ver / Editar / Eliminar lógico. Ver abre la ficha (`UserFichaModal`). |
| `/controladores` | Activar/desactivar roles y usuarios. |
| `/personas` | Redirige a `/usuarios`. |
| `/matricula` | Listado, alta (wizard) y reingreso. |
| `/asignacion` | Maestro ↔ curso/sección/periodo. Alta vía `AsignacionFormModal` (maestro, curso, grado → sección, periodo). |
| `/horarios` | **Admin:** lista de versiones (confirmar/activar). **Maestro:** `MaestroHorarioView` — grilla personal Hora×Lun–Dom (`GET /horarios/mio`), buscador, filtro grado·sección; Ver → plan de la semana + tareas del día. **Portal (modo clase):** bloques de esa clase en `AlumnoHorarioView`. |
| `/plan-estudio` | Admin/director/consejería: tabla + filtros (sin crear); Ver / Auditar (ítems con puntos/materiales). Maestro: crear (wizard: cabecera auto + sílabo lectura + parciales Σ100 pts), tabla propia, Activar, Auditoría → Resolver. Estados: pendiente/denegado/aprobado + progreso de auditoría. **Portal (modo clase):** `PortalPlanView`, sin tabla, buscador ni filtros. Muestra el pensum de la clase (sílabo), el plan activo del periodo agrupado por parcial (tarjetas de solo lectura con tipo, puntos, fechas y estado) y el botón «Descargar PDF» (`GET /portal/clases/{asig}/plan` y `/plan/pdf`). Sin plan activo: pensum + aviso, sin botón. El responsable ve «Plan de estudio» en la sidebar (`planestudio:get`). |
| `/asistencia` | Materias del **periodo activo** que aparecen en el **horario activo** (maestro: solo las suyas). Sin filtro ni columna Periodo. Menú: Ver / Asistencia / Editar / Inasistencias. Grilla semana A/T/E/F; día de hoy más intenso, otros más opacos; **días futuros no editables**. |
| `/tareas` | Tareas por curso. **Portal (modo clase):** tareas de la clase con estado Pendiente/Revisada vía `GET /portal/clases/{asig}/tareas`. **Sin columna de puntos:** el portal nunca muestra los puntos obtenidos en tareas; el resultado solo se ve como nota del parcial en Calificaciones (liberado y al día en pagos). |
| `/calificaciones` | Notas por parcial. **Portal (modo clase):** `PortalCalificacionesView` en **bento**, sin tabla (`GET /portal/clases/{asig}/calificaciones`). Arriba va el promedio de la clase a todo el ancho (anillo + total); el cuadro ya no va aquí (está en `/alumno/resultados`). Abajo va un tile por parcial con estado `visible` (puntos / máx), `bloqueado_pago` (candado + mensaje con los meses pendientes) o `no_liberado`. El promedio usa solo los parciales visibles. Sin ningún parcial liberado: mensaje «Calificaciones aún no liberadas». |
| `/liberacion-notas` | **Liberación de notas** (admin, `calificaciones:post`). Tarjetas por parcial del periodo activo: liberado, listo para liberar o en curso, con fechas y meses. **Liberar calificaciones** abre un modal con los parciales que se liberan, la regla de meses pagados y los avisos (general + personal a padres que deben). Tabla de **alumnos sin liberar** por pagos pendientes. El clic derecho da **Ver** (detalle de mensualidades) o **Forzar liberación**: advertencia con los pagos y el código, y hay que escribir el código del alumno para habilitar el botón. Servicios en `src/services/calificaciones.ts`. |
| `/pagos` | Obligaciones / mora. Pestaña Cobro, bloque **Mensualidades por mes**: código del alumno → meses del periodo con checkbox (los pagados salen desactivados). **Cobrar** manda `obligacion_pago_ids` y confirma los meses y el total. **Generar mensualidades del periodo** es idempotente. El cobro manual por tipo sigue abajo. Pestañas Cobro y Mora (ya no hay pestaña Evidencia: los recibos de padres se revisan en `/recibos`, con enlace «Recibos de padres» para quien tiene `pagos:put`). |
| `/notificaciones-admin` | Crear avisos (pull; no hay push). Tipo en select: Única temporal / Banner / Periódica. **Banner:** sin roles ni vigencia fin (lo ven todos), confirma que reemplaza al actual; menú de fila **Quitar banner** (`POST /notificaciones/{id}/desactivar`). |
| `/estadisticas` | **Análisis en bento** (admin, admin temporal, director, consejería; contabilidad ya no tiene acceso). Search params: `agrupar` (por defecto `maestro`) y `filtros`. Toolbar: select **Comparar por** (`AgruparPorSelect`: institución, maestro, alumno, materia, grado, sección, modalidad, periodo, parcial, mes). El botón **Avanzado** abre `AvanzadoModal`: secciones con todo marcado, Todos/Ninguno, buscador, cascada periodo → parciales y grado + modalidad → secciones → alumnos, y «Solo parciales liberados»; **Aplicar** actualiza la URL. **Descargar** da PDF (jsPDF con las gráficas) o Excel (exceljs, una hoja por sección) desde `helpers/export-analisis.ts`. Secciones: **Calificaciones** (principal, en este orden: promedio, desviación, más bajo y más alto con una frase de si está dentro de los rangos esperados; una sola caja y bigotes horizontal con los valores del ranking, un punto por grupo y el eje ajustado a los datos; dos tarjetas con los atípicos de abajo y de arriba; ranking en barras blancas. Debajo, mini tarjetas por tipo de tarea con su caja), **Asistencia** y **Cumplimiento del plan** (más sobrias). Por mes no hay calificaciones; por alumno no hay cumplimiento. Por alumno, las barras muestran el top y bottom 10 con buscador. Datos: `POST /estadisticas/analisis` y `GET /estadisticas/analisis/opciones` (`src/services/estadisticas.ts`). |
| `/sace` | Export SACE. |
| `/auditoria` | Log de acciones. |

## Portal alumno / responsable

- Shell: en `/maestro`, `/alumno`, `/alumno/resultados`, `/responsable` y `/hijo/*` no hay sidebar; el botón **Inicio** va en la barra superior para maestro, alumno y responsable. Alumno y responsable no tienen «Inicio» en la sidebar. En modo clase la sidebar muestra un chip con el nombre de la clase.
- Contexto: `src/lib/portal-context.ts` (hijo elegido + clase activa en `sessionStorage`; se limpia al cerrar sesión) y `src/hooks/use-portal.ts` (`usePortal`, `usePortalInicio`).
- Páginas en modo clase envueltas en `RequirePortalClase`: sin clase elegida vuelven a `/alumno`. Pagos (responsable) no depende de la clase.
- Servicio: `src/services/portal.ts`.

## Componentes que importan

- `Combobox` — filtrar lista. Con `allowCustom` también se puede escribir un valor nuevo (Enter, blur o «Usar «texto»»).
- `SearchInput` — buscador con icono lupa y placeholder «Buscar…» (DataTable, asistencia, horario maestro, etc.).
- `Field`, `Modal`, `ConfirmDialog`, `DataTable`, `WizardSteps`.
- `Modal` anima al abrir (crece con rebote) y al cerrar (crece un poco y se encoge, 280 ms). Si el padre desmonta el modal, usar `useDismiss(onClose)` para esperar la animación antes de desmontar.
- `NotificationsBell` — campanita del header para todos los perfiles: contador de no leídas (refresca cada 60 s), modal con la lista (punto de no leída, «Importante» en banners) y modal de detalle que marca leída al abrir.
- `AvisoBanner` — banner grande del inicio (`/dashboard`, `/maestro`, `/responsable` y `/alumno`): tarjeta naranja con megáfono, etiqueta «Aviso importante», fecha, título y mensaje. Usa la misma query `['notificaciones']` que la campanita (sin petición extra) y muestra la primera con `es_banner`. Tokens `--sasha-banner-bg` / `--sasha-banner-texto`.
- `MaestroHorarioView` — horario personal del maestro (`/horarios`, embebido en `/maestro` y filtrable en `/maestro/clases/$id`).
- `HorarioSemanaGrid` — tabla Hora × día (sáb/dom solo si tienen bloques); prop opcional `recesos` pinta filas «Recreo» de ancho completo. La usan `AlumnoHorarioView` (portal, filtrable por clase) y `FichaHorarioSemanaModal`.
- `PhotoCapture` — archivo o cámara; preview con `object URL`.
- `MatriculaWizard` — alta de matrícula (ver abajo).
- `UserFichaModal` — ficha de usuario (ver abajo).
- `CursoVerModal` — Ver curso: nombre + tabla de maestros/grado/sección/periodo + PDF; botón Asignar maestro.
- `AsignacionFormModal` — crear asignación; opcional `cursoId` fijo (desde Cursos).
- `NotasDrawer` — panel derecho de nota (título + editor Markdown); guarda con Listo / X / Escape.
- `components/estadisticas/` — `EChart` (ECharts modular con los colores de los tokens; se actualiza al cambiar de tema y registra la gráfica para el PDF), `Graficas` (`CajaBigotes`: una caja con la `distribucion` del bloque; `BarrasHorizontales`), `Bloques` (bloque principal, tarjetas de atípicos, mini tarjeta por tipo, sección sobria), `ExtremoCard`, `TileAmpliable` (todas las tarjetas: botón con icono de ampliar que abre la misma tarjeta en grande en un modal por portal), `AgruparPorSelect` y `AvanzadoModal`. Sin textos explicativos: solo promedio, mediana, mínimo y máximo. Bajo a la izquierda y alto a la derecha. Colores solo por importancia (gris normal, amarillo inusual, naranja muy atípico), nunca semáforo. Los textos de los extremos están en `helpers/estadisticas-mensajes.ts`.

## Pruebas e2e

- `pnpm exec playwright test` levanta su propio backend en :8081 (`DB_NAME=molde_test`, bucket `sasha-docs-test`) y un front en :3001 con `E2E_API_TARGET`, que manda sobre el `.env`. Antes de arrancar el backend corre `go run ./cmd/resetdb` para recrear `molde_test`; `E2E_SIN_RESET=1` lo omite. Así nunca se escribe en `molde_db`, la base de `pnpm dev` en :3000.

## Ficha de usuario

Archivos: `src/components/usuarios/UserFichaModal.tsx`, modales `Ficha*`, PDF en `src/lib/fichaPdf.ts`. Datos: `GET /personas/ficha/{code}?fecha&hora` (`getFicha` + hora local del navegador).

**Hero.** Nombre, código, username, roles y estado. Si es alumno, también grado · sección de la matrícula ACTIVE.

**Operativo (maestro / alumno).** Banner de clase actual según hora local; horario del día con «Ver todo» (semana + PDF). Columnas del día: alumno → Hora, Curso, Maestro, Asistencia; maestro → Hora, Curso, Grado / sección. Maestro: plan de hoy + «Ver todo» del periodo. Alumno: tareas de hoy + «Ver todo» ordenadas.

**Bloques por rol.** Datos personales siempre. Alumno: historial de matrícula, matrículas, responsables, documentos. Maestro: **Cursos** (curso, grado, sección, periodo, horarios del horario activo, estado) y disponibilidad. Responsable: domicilio / trabajo / alumnos a cargo.

**PDF.** Misma información que la ficha, incluida la sección Cursos del maestro.

## Wizard de matrícula

Archivo: `src/components/matricula/MatriculaWizard.tsx`.

Pasos: Alumno → Historial → Académico → Responsables → Foto → Confirmar.

**Alumno.** Nombres, sexo, nacimiento, teléfono (8 dígitos HN si se llena), identidad (13 dígitos si se llena). No hay campo tipo de documento; al guardar se manda `tipo_documento_identidad: 'HND'` para SACE.

**Historial.** Procedencia; alergias y condiciones con Combobox `allowCustom` (listas `GET /catalogos/alergias` y `/condiciones-aprendizaje`); grados repetidos.

**Académico.** Periodo, grado, modalidad, sección o asignación automática, mensualidad, cursos retrasados.

**Responsables.** Existente (código) o nuevo. Parentesco y profesión: mismo Combobox. Teléfonos 8 dígitos.

**Foto.** Opcional. En Confirmar se muestra la imagen arriba del resumen (no el nombre de archivo).

**Send.** `POST /boveda/upload` (si hay foto) → `POST /users/` alumno → `POST /personas/alumnos` (alergias/condiciones como strings) → `POST /matricula/` → por cada responsable `POST /users/` + `POST /personas/responsables` o solo `POST /matricula/{id}/responsables`. El backend upserta en las tablas `catalogo_*` los textos nuevos.

Listas: `listAlergias`, `listCondicionesAprendizaje`, `listParentescos`, `listProfesiones` en `src/services/catalogos.ts`.
