# Tareas — 006 Temas de estilos

> Capa: **frontend** (`sasha_fronted/`).

## Fase 1 — Reubicar el diseño actual

- [x] Renombrar `src/styles/app.css` → `src/styles/style1.css`.
- [x] Mover el bloque decorativo `body::before` (y su variante `[data-theme='light']`) desde `src/styles.css` al final de `style1.css`.
- [x] Confirmar que `style1.css` sigue importando `tokens.css` y `neon.css`.

## Fase 2 — Hoja principal

- [x] Reescribir `src/styles.css`: fuentes + Tailwind + **contrato documentado** + `@import './styles/style1.css'` + resets globales (sin decoración).

## Fase 3 — Documentación

- [x] `documentacion/ESTILOS.md`: análisis, contrato y guía para `style2.css`.
- [x] `documentacion/MAPA.md`: actualizar la línea de capas.

## Fase 4 — Verificación

- [x] `pnpm exec tsc --noEmit` y `pnpm build` OK.
- [x] Confirmar que no queda ninguna referencia a `app.css`.
- [x] El CSS compilado incluye el diseño (`style1.css` resuelto).
