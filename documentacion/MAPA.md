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
| `/login` | Código + contraseña. Sin selector de rol. Maestro → `/maestro`; resto → `/dashboard`. |
| `/dashboard` | Inicio autenticado (roles no-maestro). |
| `/maestro` | **Hub del maestro** tras login: cards + horario abajo. **Sin sidebar.** Menú ⋮: Ver / Pasar lista / Agregar tarea (modales). **Ir** → dashboard de clase. Top **Inicio** / marca **Sasha** vuelven aquí. |
| `/maestro/clases/$asignacionId` | **Dashboard asistente** (bento): Ahora (slot), Notas (tarjetas + Nueva), Alumnos (pastilla Pendiente/Incompleta/Lista + ratio marcas/total + Pasar lista), Tareas a revisar hoy (⋮ Revisar), y abajo a todo el ancho **Plan de esta semana**: barra de progreso tipo termómetro (iniciado = mitad del ítem, finalizado = ítem completo) + tarjetas (título, descripción, fechas, pts, materiales) con ⋮ para cambiar cumplimiento (`PUT /planestudio/cumplimiento/{id}`). Drawer de notas a la derecha (Markdown TipTap; guarda al cerrar / Listo; TTL 14 días). Sidebar: ítem Dashboard. |
| `/mi-perfil` | Contraseña propia y foto de perfil (bóveda). |
| `/configuracion` | Nombre institución, código SACE, umbrales de nota. |
| `/catalogos/grados` | CRUD grados. |
| `/catalogos/modalidades` | CRUD turnos (horarios, recreos, parciales). |
| `/catalogos/secciones` | CRUD secciones (grado + modalidad). |
| `/catalogos/cursos` | CRUD cursos con sílabo (requisitos, horas, objetivos, competencias, estrategias, evaluación, recursos, bibliografía). Menú: Ver (maestros asignados + PDF), Asignar maestro (curso fijo), Editar, Eliminar. |
| `/catalogos/periodos` | CRUD periodos lectivos. Solo uno puede estar **activo**; al activar otro, el anterior pasa a inactivo. |
| `/usuarios` | Alta/edición de usuarios; al crear alumno/maestro/responsable también crea el perfil. DataTable: Descargar (Excel/PDF), menú Ver / Editar / Eliminar lógico. Ver abre la ficha (`UserFichaModal`). |
| `/controladores` | Activar/desactivar roles y usuarios. |
| `/personas` | Redirige a `/usuarios`. |
| `/matricula` | Listado, alta (wizard) y reingreso. |
| `/asignacion` | Maestro ↔ curso/sección/periodo. Alta vía `AsignacionFormModal` (maestro, curso, grado → sección, periodo). |
| `/horarios` | **Admin:** lista de versiones (confirmar/activar). **Maestro:** `MaestroHorarioView` — grilla personal Hora×Lun–Dom (`GET /horarios/mio`), buscador, filtro grado·sección; Ver → plan de la semana + tareas del día. |
| `/plan-estudio` | Admin/director/consejería: tabla + filtros (sin crear); Ver / Auditar (ítems con puntos/materiales). Maestro: crear (wizard: cabecera auto + sílabo lectura + parciales Σ100 pts), tabla propia, Activar, Auditoría → Resolver. Estados: pendiente/denegado/aprobado + progreso de auditoría. |
| `/asistencia` | Materias del **periodo activo** que aparecen en el **horario activo** (maestro: solo las suyas). Sin filtro ni columna Periodo. Menú: Ver / Asistencia / Editar / Inasistencias. Grilla semana A/T/E/F; día de hoy más intenso, otros más opacos; **días futuros no editables**. |
| `/tareas` | Tareas por curso. |
| `/calificaciones` | Notas por parcial. |
| `/pagos` | Obligaciones / mora. |
| `/notificaciones-admin` | Crear avisos (pull; no hay push). |
| `/estadisticas` | Paneles de conteo. |
| `/sace` | Export SACE. |
| `/auditoria` | Log de acciones. |

## Componentes que importan

- `Combobox` — filtrar lista. Con `allowCustom` también se puede escribir un valor nuevo (Enter, blur o «Usar «texto»»).
- `SearchInput` — buscador con icono lupa y placeholder «Buscar…» (DataTable, asistencia, horario maestro, etc.).
- `Field`, `Modal`, `ConfirmDialog`, `DataTable`, `WizardSteps`.
- `Modal` anima al abrir (crece con rebote) y al cerrar (crece un poco y se encoge, 280 ms). Si el padre desmonta el modal, usar `useDismiss(onClose)` para esperar la animación antes de desmontar.
- `NotificationsBell` — campanita del header para todos los perfiles: contador de no leídas (refresca cada 60 s), modal con la lista (punto de no leída, «Importante» en banners) y modal de detalle que marca leída al abrir.
- `MaestroHorarioView` — horario personal del maestro (`/horarios`, embebido en `/maestro` y filtrable en `/maestro/clases/$id`).
- `PhotoCapture` — archivo o cámara; preview con `object URL`.
- `MatriculaWizard` — alta de matrícula (ver abajo).
- `UserFichaModal` — ficha de usuario (ver abajo).
- `CursoVerModal` — Ver curso: nombre + tabla de maestros/grado/sección/periodo + PDF; botón Asignar maestro.
- `AsignacionFormModal` — crear asignación; opcional `cursoId` fijo (desde Cursos).
- `NotasDrawer` — panel derecho de nota (título + editor Markdown); guarda con Listo / X / Escape.

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
