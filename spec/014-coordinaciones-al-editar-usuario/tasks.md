# Tareas — `014-coordinaciones-al-editar-usuario` (frontend)

## 1. Componente compartido
- [x] `src/components/coordinaciones/CoordinacionesSelect.tsx`: nuevo componente (checkboxes + `Field` + estados), con `testIdPrefix` (default `user`).

## 2. Alta de usuario
- [x] `src/routes/_app/usuarios.tsx`: quitar el `CoordinacionesSelect` local y `listCoordinaciones` del import; importar el compartido y usarlo con `testIdPrefix="user"`.

## 3. Edición de usuario
- [x] `src/components/personas/PersonaEditModal.tsx`: estado `coordSel`; query `coordinacionesDeUsuario(code)` (solo coordinador original + permisos); efecto de precarga.
- [x] `src/components/personas/PersonaEditModal.tsx`: `requiereCoordinaciones` en `valid`; `asignarCoordinaciones` tras `updateRoles`; render del selector (`testIdPrefix="persona-edit"`).

## 4. e2e
- [x] `src/tests/e2e/coordinador.spec.ts`: crear usuario → editar a Coordinador → selector visible, guardar deshabilitado sin marcar, habilitado con una, guarda y la fila muestra «Coordinador».

## 5. Verificación
- [x] `pnpm generate-routes`.
- [x] `pnpm exec tsc --noEmit` PASS.
- [x] `pnpm exec eslint <archivos>` PASS (0 errores nuevos; los preexistentes de los archivos siguen igual).
- [x] Verificado en vivo (dev `:3000`): coordinador → selector con sus coordinaciones premarcadas; desmarcar todas exige ≥1 y bloquea «Guardar»; no-coordinador al elegir Coordinador → aparece el selector vacío y bloquea «Guardar».
- [ ] e2e `coordinador.spec.ts` (no ejecutado: requiere backend `:8081` + DB `molde_test`, no disponibles aquí).

## 6. Cierre
- [ ] Preguntar por MAPA y notas del vault.

