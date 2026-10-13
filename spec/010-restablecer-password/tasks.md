# Tareas — `010-restablecer-password` (frontend)

## 1. Permisos y menú
- [ ] `src/helpers/permissions.ts`: `credenciales:get`/`credenciales:post` en admin y developer.
- [ ] `src/helpers/nav.ts`: ítem «Restablecer contraseña».
- [ ] `src/components/layout/nav-icons.tsx`: icono `key`.

## 2. Servicio
- [ ] `src/services/users.ts`: `getCredencial(code)` y `resetPassword(code)` (blob).

## 3. Página
- [ ] `src/routes/_app/restablecer-password.tsx`: form de código, ficha, botón generar + confirmación, descarga del PDF.

## 4. Verificación
- [ ] `pnpm generate-routes`.
- [ ] `pnpm exec tsc --noEmit` PASS.
- [ ] `pnpm exec eslint src/routes/_app/restablecer-password.tsx src/services/users.ts src/helpers/nav.ts src/helpers/permissions.ts` PASS.
- [ ] e2e `restablecer-password.spec.ts` (no ejecutado sin DB/backend).

## 5. Cierre
- [ ] Preguntar por MAPA y notas del vault.
