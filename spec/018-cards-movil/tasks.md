# Tareas — 018 Cards en móvil (tablas del maestro + horarios)

> Capa: **frontend** (`sasha_fronted/`). Orden de ejecución de arriba a abajo.

## Fase 1 — Mecanismo (base reutilizable)

- [x] `src/hooks/use-media-query.ts`: `useMediaQuery` (con `useSyncExternalStore`) y `useEsMovil()`
      (`(max-width: 768px)`).
- [x] `src/components/ui/RowMenu.tsx`: botón 3 puntos + menú (`.ctx-menu`), `RowAction`, cierre por
      clic fuera/Esc; `aria-haspopup`/`aria-expanded`.
- [x] `src/components/ui/DataTable.tsx`: props `card` y `rowActions`; render de `<ul class="data-cards">`
      en móvil manteniendo título, buscador, filtros, Descargar y pager de 25.
- [x] `src/styles/style1.css`: `.data-cards`, `.data-card*`, `.row-menu*` (sólidos, sin degradados).

## Fase 2 — Cards del maestro

- [x] `/tareas` (staff): card título · puntos · entrega · entregas · pill Revisada/Sin revisar;
      3 puntos con Ver, Revisar, Cargar imagen, Tomar foto, Editar, Eliminar (mismos `data-testid`).
      El listado general no trae `revisada`: para el maestro se consulta su clase (`getClaseTareas`).
- [x] `/calificaciones` (maestro): card nombre · parciales con puntaje · total · promedio · estado
      (sin 3 puntos: no hay acciones de fila).
- [x] `/recuperaciones`: card + 3 puntos Ver / Editar / Eliminar.
- [x] `/plan-estudio` (`MaestroView`): card Clase · Grado · Aprobación · Auditoría + pill Activo y
      3 puntos Ver / Editar / Auditoría / Activar.

## Fase 3 — Horarios en móvil (vista por días)

- [x] `src/components/horarios/HorarioDiasView.tsx`: nuevo (días-tabs + `app-list`).
- [x] `src/routes/_app/hijo/horario.tsx`: usa `HorarioDiasView` (mismos `padre-horario-*`).
- [x] `AlumnoHorarioView`: móvil → `HorarioDiasView`; escritorio sigue `HorarioSemanaGrid`.
- [x] `MaestroHorarioView`: móvil → `HorarioDiasView` + 3 puntos «Ver» por bloque; escritorio igual.

## Fase 4 — Asistencia en móvil (sin cards)

- [x] `/asistencia` (maestro, `AsistenciaGridModal inline`): bloque `@media (max-width: 768px)` para
      apilar la barra (vista, fecha, búsqueda y botones) y agrandar las celdas. Sin cambiar la lógica
      ni la estructura (lista de alumnos + columna para pasar lista).

## Fase 5 — Tests e2e

- [x] `src/tests/e2e/cards-movil.spec.ts` (viewport 390×844, táctil): cards visibles y tabla oculta
      en tareas/calificaciones/recuperaciones/plan; el 3 puntos abre el menú con los mismos ítems y
      una acción funciona (tareas → Revisar).
- [x] Horario maestro y alumno: pestañas de días + lista.
- [x] Asistencia del maestro: lista + celdas usables.

## Fase 6 — Verificación

- [x] `pnpm exec tsc --noEmit` sin errores.
- [x] `pnpm exec eslint` sin errores nuevos (los avisos de los archivos tocados son los mismos que ya
      tenía `main`; comprobado con `git stash`).
- [x] `pnpm build` OK.
- [x] `cards-movil.spec.ts` 7/7; regresión de escritorio: `tareas`, `calificaciones`, `recuperaciones`,
      `plan-estudio`, `portal`, `portal-padre`, `horario-maestro`, `asistencia`, `modulos`, `smoke` →
      **56 pasan**, 3 fallan **por causas ya existentes en `main`** (comprobado con `git stash`).
- [ ] Preguntar si se actualiza `documentacion/MAPA.md` y si se crea la nota `REG-UI` en el vault.
