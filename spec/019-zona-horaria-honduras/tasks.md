# Tareas: Zona horaria de negocio (América/Tegucigalpa) - Frontend

Cada tarea es un paso atómico. Marca `[x]` al completar.

## TAR-1 Horario del maestro

- [x] `src/components/horarios/MaestroHorarioView.tsx:23`: `todayISO()` usa fecha local
      (`getFullYear/getMonth/getDate`) en vez de `toISOString()`.

## TAR-2 Nombres de archivo de exportación

- [x] `src/helpers/export-sace.ts:37`: fecha local en el nombre del archivo.
- [x] `src/helpers/export-analisis.ts:58`: fecha local en el nombre del archivo.
- [x] `src/helpers/export-analitica-pagos.ts:51`: fecha local en el nombre del archivo.

## TAR-3 Verificación

- [x] `pnpm run build` (o `npx tsc --noEmit` + build) sin errores.
- [ ] Revisión manual de la semana inicial del horario.
