# Tareas — `013-forzar-horario-manual` (frontend)

> Capa: **frontend** (`sasha_fronted/`). Solo frontend: sin backend, sin endpoints, sin permisos, **sin migración**.
> Checkbox **«No permitir forzar»** en el panel manual de armado de horarios que, al desmarcarse, avisa con un modal y
> luego permite **colocar/mover** bloques **ignorando el conflicto de MAESTRO**. El conflicto de **SECCIÓN** sigue bloqueado.
> El **generador automático** (`Generar` → `POST /horarios/preview`) **no cambia**.

## 1. Preparación / regla
- [x] Confirmar alcance: el permiso es **opt-in por sesión de armado**, **efímero** (no se persiste) y **no altera** el generador automático.
- [x] Confirmar que el generador automático (`Generar` → `POST /horarios/preview`) queda intacto (fuera de alcance).
- [x] Confirmar reglas aplicables: REG-UI-01 (tokens, sin degradados), REG-UI-04 (acción en modal con confirmación), REG-UI-10 (animación de modales), REG-UI-05 (toast de conflicto), REG-UI-08 (dentro del wizard).

## 2. Estado y reset en `src/routes/_app/horarios.tsx`
- [x] Añadir estado `permitirForzar` (default `false`) y `avisoForzar` (default `false`) en la página.
- [x] Resetear ambos a `false` en `resetWizardState` (al abrir/cerrar el wizard).

## 3. UI — checkbox y modal de aviso en `horarios.tsx`
- [x] Checkbox **«No permitir forzar»** (`<label>` + `<input type="checkbox">`) en el footer del `<Modal board>`, junto a «Activar al guardar».
- [x] `data-testid="horario-forzar-checkbox"` y estado **marcado por defecto** (`checked={!permitirForzar}`).
- [x] Al **desmarcar** (`setPermitirForzar(true)`) abrir `setAvisoForzar(true)`; al **volver a marcar** (`setPermitirForzar(false)`) no mostrar aviso.
- [x] `<Modal>` de advertencia con `testId="horario-forzar-aviso"` y **un solo botón «Cerrar»** (`data-testid="horario-forzar-aviso-cerrar"`, `className="btn btn--ghost"`, cierra con `onClose`).
- [x] Texto de advertencia: se podrá poner **al mismo maestro en varias secciones a la misma hora**; el conflicto de **sección** sigue bloqueado.
- [x] Pasar `permitirForzar={permitirForzar}` a `<HorarioBoard>`.
- [x] Sin degradados: reusar clases existentes (`modal__footer`, `texto-muted`, `btn`) y tokens.

## 4. Lógica de colocación en `src/components/horarios/HorarioBoard.tsx`
- [x] Nueva prop `permitirForzar?: boolean` en `HorarioBoardProps` (default `false`).
- [x] En `isPlaceable`: aplicar el chequeo de **maestro** solo si `!permitirForzar`; el de **sección** siempre.
- [x] En `placeableIds`: ignorar `maestroBusy` si `permitirForzar` (el `secBusy` sigue filtrando) y añadir `permitirForzar` a las dependencias del `useMemo`.
- [x] En `onDropCell`: la rama de conflicto de **maestro** ya no se alcanza con `permitirForzar`; conservar el mensaje de error para el caso **sección** en mover y colocar.
- [x] No modificar `slotsFromPlaced` ni `placedFromPreviewSlots` (la persistencia no cambia).

## 5. Verificación
- [x] `pnpm exec tsc --noEmit` PASS.
- [ ] `pnpm generate-routes` (no hay rutas nuevas; validar el árbol).
- [ ] `pnpm exec eslint` de los archivos tocados.
- [ ] e2e (Playwright) del panel admin — **opcional**: nuevo `horarios.spec.ts` que valide checkbox marcado por defecto, bloqueo de maestro, desmarcar → `horario-forzar-aviso` con un solo «Cerrar», forzado permitido y choque de sección aún bloqueado (requiere backend + DB local).

## 6. Cierre
- [ ] Preguntar por MAPA (frontend `sasha_fronted/documentacion/MAPA.md`) y notas del vault.
- [ ] Registrar como `DEC-`/`CON-` la decisión «permitir forzar choque de maestro por sesión de armado, sin persistir y sin tocar el generador automático».
