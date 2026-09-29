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
| `/alumno/resultados` | **Resultado general** en bento (alumno, o responsable con hijo elegido; sin hijo → `/responsable`). **Sin sidebar.** Tiles: promedio general (anillo, aviso si hay parciales ocultos por pago), cuadro, total de puntos, materias aprobadas y reprobadas, mejor materia, materia a reforzar (solo con 2+ materias con nota) y lista de materias con barra y «Sin nota» (`GET /portal/resumen`). «Volver al inicio». El cuadro sale del promedio de todas las materias, no de cada una. |
| `/responsable` | **Selector de hijo** del responsable: banner + cards de alumnos a cargo (`GET /portal/hijos`). **Sin sidebar.** Elegir guarda el hijo (`sessionStorage` `sasha.portal.alumnoId`) y va a `/alumno`. Con un solo hijo salta directo. |
| `/alumno` | **Inicio del portal** (alumno, o responsable viendo al hijo elegido). **Sin sidebar.** Horario semanal completo con fila «Recreo» (`AlumnoHorarioView`) + cards de clases (solo las que tienen bloques en el horario activo) con badge `T{n}` = tareas sin revisar que vencen **hoy o mañana**, y la línea «Tarea hoy: n · Mañana: m» (`GET /portal/inicio`). Entre el horario y las clases va **Resultado general** (`GET /portal/resumen`): anillo con el promedio de todas las materias con parciales liberados, el cuadro (excelencia, honor, aprobado, reprobado) y «Ver más» → `/alumno/resultados`. Sin notas liberadas: «Aún no hay calificaciones liberadas». Banner solo para alumno o responsable con un hijo. Responsable con 2+ hijos: «Cambiar alumno». Click en card → **modo clase** (`sessionStorage` `sasha.portal.clase`) y abre `/tareas`. |
| `/maestro` | **Hub del maestro** tras login: banner activo arriba (`AvisoBanner`), cards + horario abajo. **Sin sidebar.** Menú ⋮: Ver / Pasar lista / Agregar tarea (modales). **Ir** → dashboard de clase. Top **Inicio** / marca **Sasha** vuelven aquí. |
| `/maestro/clases/$asignacionId` | **Dashboard asistente** (bento): Ahora (slot), Notas (tarjetas + Nueva), Alumnos (pastilla Pendiente/Incompleta/Lista + ratio marcas/total + Pasar lista), Tareas a revisar hoy (⋮ Revisar), y abajo a todo el ancho **Plan de esta semana**: barra de progreso tipo termómetro (iniciado = mitad del ítem, finalizado = ítem completo) + tarjetas (título, descripción, fechas, pts, materiales) con ⋮ para cambiar cumplimiento (`PUT /planestudio/cumplimiento/{id}`). Drawer de notas a la derecha (Markdown TipTap; guarda al cerrar / Listo; TTL 14 días). Sidebar: ítem Dashboard. |
| `/mi-perfil` | Contraseña propia y foto de perfil (bóveda). |
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
| `/tareas` | Tareas por curso. **Portal (modo clase):** tareas de la clase con estado Pendiente/Revisada y puntos vía `GET /portal/clases/{asig}/tareas`. Los puntos se ocultan si el parcial de la tarea no está visible para el alumno (sin liberar o con meses pendientes). |
| `/calificaciones` | Notas por parcial. **Portal (modo clase):** `PortalCalificacionesView` en **bento**, sin tabla (`GET /portal/clases/{asig}/calificaciones`). Arriba va el promedio de la clase a todo el ancho (anillo + total); el cuadro ya no va aquí (está en `/alumno/resultados`). Abajo va un tile por parcial con estado `visible` (puntos / máx), `bloqueado_pago` (candado + mensaje con los meses pendientes) o `no_liberado`. El promedio usa solo los parciales visibles. Sin ningún parcial liberado: mensaje «Calificaciones aún no liberadas». |
| `/liberacion-notas` | **Liberación de notas** (admin, `calificaciones:post`). Tarjetas por parcial del periodo activo: liberado, listo para liberar o en curso, con fechas y meses. **Liberar calificaciones** abre un modal con los parciales que se liberan, la regla de meses pagados y los avisos (general + personal a padres que deben). Tabla de **alumnos sin liberar** por pagos pendientes. El clic derecho da **Ver** (detalle de mensualidades) o **Forzar liberación**: advertencia con los pagos y el código, y hay que escribir el código del alumno para habilitar el botón. Servicios en `src/services/calificaciones.ts`. |
| `/pagos` | Obligaciones / mora. Pestaña Cobro, bloque **Mensualidades por mes**: código del alumno → meses del periodo con checkbox (los pagados salen desactivados). **Cobrar** manda `obligacion_pago_ids` y confirma los meses y el total. **Generar mensualidades del periodo** es idempotente. El cobro manual por tipo sigue abajo. |
| `/notificaciones-admin` | Crear avisos (pull; no hay push). Tipo en select: Única temporal / Banner / Periódica. **Banner:** sin roles ni vigencia fin (lo ven todos), confirma que reemplaza al actual; menú de fila **Quitar banner** (`POST /notificaciones/{id}/desactivar`). |
| `/estadisticas` | **Análisis en bento** (admin, admin temporal, director, consejería; contabilidad ya no tiene acceso). Search params: `agrupar` (por defecto `maestro`) y `filtros`. Toolbar: select **Comparar por** (`AgruparPorSelect`: institución, maestro, alumno, materia, grado, sección, modalidad, periodo, parcial, mes). El botón **Avanzado** abre `AvanzadoModal`: secciones con todo marcado, Todos/Ninguno, buscador, cascada periodo → parciales y grado + modalidad → secciones → alumnos, y «Solo parciales liberados»; **Aplicar** actualiza la URL. **Descargar** da PDF (jsPDF con las gráficas) o Excel (exceljs, una hoja por sección) desde `helpers/export-analisis.ts`. Secciones: **Calificaciones** (principal, en este orden: promedio, desviación, más bajo y más alto con una frase de si está dentro de los rangos esperados; una sola caja y bigotes horizontal con los valores del ranking, un punto por grupo y el eje ajustado a los datos; dos tarjetas con los atípicos de abajo y de arriba; ranking en barras blancas. Debajo, mini tarjetas por tipo de tarea con su caja), **Asistencia** y **Cumplimiento del plan** (más sobrias). Por mes no hay calificaciones; por alumno no hay cumplimiento. Por alumno, las barras muestran el top y bottom 10 con buscador. Datos: `POST /estadisticas/analisis` y `GET /estadisticas/analisis/opciones` (`src/services/estadisticas.ts`). |
| `/sace` | Export SACE. |
| `/auditoria` | Log de acciones. |

## Portal alumno / responsable

- Shell: en `/maestro`, `/alumno`, `/alumno/resultados` y `/responsable` no hay sidebar; el botón **Inicio** va en la barra superior para maestro, alumno y responsable. Alumno y responsable no tienen «Inicio» en la sidebar. En modo clase la sidebar muestra un chip con el nombre de la clase.
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
