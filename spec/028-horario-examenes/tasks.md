# Tareas — Horario de exámenes — Frontend

## Estado (2026-11-07)

- Hecho: Fases 1–12 implementadas; `tsc --noEmit` y `pnpm build` OK; lint de los archivos tocados OK; MAPA actualizado.
- Pendiente: e2e 13.1–13.3 y commit/push (13.7).

## Fase 1: Base

- [ ] 1.1 `services/examenes.ts` con tipos y llamadas.
- [ ] 1.2 `lib/examenes.ts` con fechas (`01 L`), bloques y salida.
- [ ] 1.3 Permisos `examenes:*` en `helpers/permissions.ts`.
- [ ] 1.4 Entradas de menú y command palette.
- [ ] 1.5 Registrar rutas y regenerar `routeTree.gen.ts`.

## Fase 2: Lista de administración

- [ ] 2.1 Página `/examenes` con `DataTable` y filtros.
- [ ] 2.2 Columnas periodo, parcial, modalidad, fechas, versión y estado.
- [ ] 2.3 Acciones Ver, Editar, Publicar, Activar y Eliminar.
- [ ] 2.4 Conteo, buscador «Buscar…» y exportación.
- [ ] 2.5 Cards móviles (REG-UI-17).

## Fase 3: Wizard — Datos

- [ ] 3.1 `ExamenWizard` con `WizardSteps`.
- [ ] 3.2 Selectores periodo, parcial (filtrado por periodo) y modalidad.
- [ ] 3.3 Fechas de inicio y fin con validación.
- [ ] 3.4 Validar que las fechas caigan dentro del parcial.

## Fase 4: Wizard — Bloques

- [ ] 4.1 Preguntar “¿Cuántos exámenes por día?”.
- [ ] 4.2 Filas repetibles con hora de inicio y fin.
- [ ] 4.3 Validar orden, solapamiento y receso.
- [ ] 4.4 Mostrar el receso como el hueco entre bloques.
- [ ] 4.5 Aplicar los mismos bloques a todos los días.

## Fase 5: Wizard — Supervisores

- [ ] 5.1 Pregunta “¿Agregar supervisores?”.
- [ ] 5.2 Selector de maestro y botón + para agregar `grado-sección`.
- [ ] 5.3 Permitir varias secciones por maestro y varios maestros.
- [ ] 5.4 Quitar secciones y maestros.
- [ ] 5.5 Validar que no se repita el mismo par maestro-sección.

## Fase 6: Tablero

- [ ] 6.1 `ExamenBoard` con filas de fechas (`01 L`) y columnas de bloques.
- [ ] 6.2 Pastillas de `materia · grado · sección`.
- [ ] 6.3 Pastilla “solo materia” que expande a toda la modalidad.
- [ ] 6.4 Drag & drop y reubicación de bloques.
- [ ] 6.5 Bloquear dos exámenes de la misma sección en el mismo bloque.
- [ ] 6.6 No validar choque de maestro.
- [ ] 6.7 Filtros por grado, sección y materia.
- [ ] 6.8 Celdas vacías permitidas.
- [ ] 6.9 Scroll horizontal y vista móvil.

## Fase 7: Generar, guardar y publicar

- [ ] 7.1 Botón **Generar** con preview.
- [ ] 7.2 Respetar bloques fijos al regenerar.
- [ ] 7.3 Mostrar avisos y resumen de capacidad.
- [ ] 7.4 Guardar borrador.
- [ ] 7.5 Publicar con confirmación.
- [ ] 7.6 Editar un horario publicado y avisar que se actualizará.
- [ ] 7.7 Activar/desactivar versión.

## Fase 8: Vista y PDF

- [ ] 8.1 `ExamenViewModal` de solo lectura.
- [ ] 8.2 Filtrar por grado/sección.
- [ ] 8.3 Exportar PDF con el mismo diseño.
- [ ] 8.4 Mostrar versión y estado.

## Fase 9: Maestro — Semana

- [ ] 9.1 Toggle “Clases / Exámenes” en `/maestro`.
- [ ] 9.2 Página `/maestro/examenes` con lo supervisado por defecto.
- [ ] 9.3 Botón **Ver todo** y filtros por grado/sección/fecha.
- [ ] 9.4 Tarjetas/grilla por fecha y bloque.
- [ ] 9.5 Resaltar lo que supervisa.
- [ ] 9.6 Responsive PC/móvil.

## Fase 10: Maestro — Ahora

- [ ] 10.1 Página `/maestro/examenes/ahora` limpia.
- [ ] 10.2 Examen(es) del bloque actual de sus secciones.
- [ ] 10.3 Soportar dos secciones con exámenes simultáneos.
- [ ] 10.4 Lista de alumnos con pagos pendientes (informativa).
- [ ] 10.5 Cards con foto, nombre, código, grado y sección.
- [ ] 10.6 Botón **Pasar lista** (A/T/E/F).
- [ ] 10.7 Guardar una vez por examen y permitir corrección.
- [ ] 10.8 Botón **Reportar alumno** con modal (código + detalle).
- [ ] 10.9 Refrescar la hora y el examen actual.

## Fase 11: Reportes del maestro

- [ ] 11.1 Página `/maestro/reportes-examen`.
- [ ] 11.2 Tabla código, nombre, grado-sección, materia, fecha y supervisor.
- [ ] 11.3 Filtros y **Ver** con el detalle.
- [ ] 11.4 **Nuevo reporte** para cualquier maestro.
- [ ] 11.5 Editar y eliminar los propios.
- [ ] 11.6 Cards móviles.

## Fase 12: Portal

- [ ] 12.1 `ExamenHorarioView` para alumno y responsable.
- [ ] 12.2 Cambiar automáticamente en fechas de examen.
- [ ] 12.3 Título “Horario de exámenes”.
- [ ] 12.4 Mostrar fechas, bloques, materias y hora de salida.
- [ ] 12.5 Aviso informativo de pagos pendientes.
- [ ] 12.6 Responsive por días.
- [x] 12.7 Toggle Horario/Exámenes: automático en fechas y manual para ver el próximo horario, con horas AM/PM, duración y recesos.

## Fase 13: Pruebas y cierre

- [ ] 13.1 E2E admin: crear, generar, publicar y ver.
- [ ] 13.2 E2E maestro: ahora, pasar lista y reportar.
- [ ] 13.3 E2E portal: horario de exámenes y aviso de pagos.
- [ ] 13.4 `tsc --noEmit`.
- [ ] 13.5 `eslint` de los archivos tocados.
- [ ] 13.6 `pnpm build`.
- [ ] 13.7 MAPA, `DEC-`/`CON-` y commit/push.

## Ajustes UX del modo maestro (2026-11-07)

- [x] 1/15 Toggle **Exámenes / Clases** en el topbar, junto al tema.
- [x] 2/15 Modo examen sin barra lateral ni hamburguesa.
- [x] 3/15 Quitar la card “Exámenes” y el toggle duplicado del hub y de la semana.
- [x] 4/15 Quitar el texto “Solo las secciones que supervisas”.
- [x] 5/15 Encabezado limpio de la semana, con el estado en el botón **Ver todo**.
- [x] 6/15 Móvil: un solo botón **Filtrar**.
- [x] 7/15 Móvil: modal de filtros con Grado, Grado/Sección, Fecha, Limpiar y Aplicar.
- [x] 8/15 Quitar el verde de las cards; usar tokens de la paleta.
- [x] 9/15 Fixture: exámenes de 7-2 con materias distintas.
- [x] 10/15 Fixture: 7-2 supervisado por otro maestro.
- [x] 11/15 Backend: `/mios` solo lo supervisado; `?todas=1` trae el resto.
- [x] 12/15 Frontend: **Ver todo** y filtros; badge “Supervisas” solo en lo propio.
- [x] 12b/15 Botón **Reportar** en la semana: abre `ReporteModal` con los exámenes, código y detalle.
- [x] 13/15 Verificación móvil (390 px) del botón y modal.
- [x] 14/15 Regresión: `tsc`, `build`, `go build`, `go test`.
- [x] 15/15 Documentación (MAPA/tasks). Commit/push queda pendiente de aprobación.

## Reportes generales para staff (2026-11-07)

- [x] 1/10 Admin, admin temporal, director y consejería ven todos los reportes.
- [x] 2/10 Eliminación: autor o roles de supervisión institucional.
- [x] 3/10 Migración `081` y `seed`: permiso `examenes:reportes_delete` en `molde_test` y `molde_db`.
- [x] 4/10 Backend verificado: `GET` y `DELETE` con admin, director y consejería.
- [x] 5/10 Página `/reportes-examen`.
- [x] 6/10 Tabla general con alumno, grado/sección, materia, fecha, supervisor y reportó.
- [x] 7/10 Solo lectura + Eliminar; sin crear ni editar.
- [x] 8/10 Menú “Reportes de examen” para los roles de staff.
- [x] 9/10 Verificación en navegador y API; guard de rol.
- [x] 10/10 Documentación (MAPA, API_CLIENTES, tasks). Commit/push pendiente de aprobación.
