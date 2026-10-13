# Tareas — `011-monitores` (frontend)

## 1. Permisos y menú
- [ ] `src/helpers/permissions.ts`: `monitores:get` en admin, admin_temporal, director y consejeria.
- [ ] `src/helpers/nav.ts`: ítem «Monitores».
- [ ] `src/components/layout/nav-icons.tsx`: icono.

## 2. Servicio
- [ ] `src/services/monitores.ts`: tipos + `getMonitor({fecha,hora})`.

## 3. Página y modales
- [ ] `src/routes/_app/monitores.tsx`: cabecera (título + bloque + buscador) y grid de cards con plan e iconos.
- [ ] `src/components/monitores/MonitorTareasModal.tsx` (→ `TareaRevisionModal`).
- [ ] `src/components/monitores/MonitorAsistenciaModal.tsx` (faltantes / tardes).

## 4. Verificación
- [ ] `pnpm generate-routes`.
- [ ] `pnpm exec tsc --noEmit` PASS.
- [ ] `pnpm exec eslint` de los archivos tocados PASS.
- [ ] e2e `monitores.spec.ts` (no ejecutado sin DB/backend).

## 5. Cierre
- [ ] Preguntar por MAPA y notas del vault.
