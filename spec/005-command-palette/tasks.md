# Tareas — 005 Command Palette (Ctrl+K)

> Capa: **frontend** (`sasha_fronted/`). Orden de ejecución de arriba a abajo.

## Fase 1 — Base

- [x] `src/config/atajos-teclado.json` con el atajo `abrir-buscador-comandos` (`Ctrl+K`, `activo: true`).
- [x] `tsconfig.json`: `resolveJsonModule: true`.
- [x] `src/helpers/command-palette.ts`:
  - [x] tipos (`Comando`, `ComandoAgregar`, `GrupoComando`)
  - [x] `DESCRIPCION_RUTA` y `PALABRAS_CLAVE_RUTA` (sinónimos)
  - [x] `COMANDOS_AGREGAR` (10 acciones con permiso, ruta e `intentId`)
  - [x] `normaliza()` y `buscarComandos()` (rank + AND de tokens)

## Fase 2 — Infra de acciones

- [x] `src/lib/accion-palette.ts` (`solicitarAccion`, `consumirAccion`, `alRecibirAccion`).
- [x] `src/hooks/use-accion-palette.ts` (`useAccionPalette`).

## Fase 3 — UI

- [x] `src/components/layout/nav-icons.tsx` (`NAV_ICONS`, `<NavIcon>`).
- [x] `src/components/layout/CommandPalette.tsx` (input, lista, grupos, ↑/↓/Enter/Escape, clic).
- [x] `src/styles/app.css`: bloque `.cmdk*` (backdrop oscuro + blur, caja, input, grupos, item activo), claro y oscuro.

## Fase 4 — Integración

- [x] `AppShell.tsx`: `<NavIcon>`, estado del palette, listener `Ctrl/Cmd+K` respetando `activo`, comandos derivados de `NAV_ITEMS` + acciones filtradas por `can`, `ejecutar` con `navigate`/`solicitarAccion`.
- [x] Cablear `useAccionPalette` en las 10 rutas destino (tareas, cursos, grados, secciones, modalidades, periodos, usuarios, excusas, disciplina, matrícula).

## Fase 5 — Verificación

- [x] `pnpm exec tsc --noEmit` sin errores nuevos.
- [x] `pnpm build` OK.
- [x] `pnpm exec eslint` sin errores nuevos en archivos nuevos.
- [ ] Prueba manual (admin y maestro): abrir, buscar por sinónimo, navegar, crear.
- [ ] Preguntar si se actualiza `documentacion/MAPA.md`.
