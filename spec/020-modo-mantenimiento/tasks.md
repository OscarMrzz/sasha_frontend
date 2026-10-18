# Tareas: Modo mantenimiento (pantalla + botón del dev) - Frontend

## TAR-1 Servicio y estado

- [x] `src/services/mantenimiento.ts`: `getEstadoMantenimiento` (público) y `setMantenimiento`.
- [x] `MantenimientoProvider` + sondeo (~15 s) montado en `AppProviders.tsx`.

## TAR-2 Redirección global

- [x] Watcher en `__root.tsx` `RootComponent`: si activo y no es `/mantenimiento` y el rol no es
      `developer` → `window.location.assign('/mantenimiento')`.
- [x] `src/lib/api.ts`: detectar 503 con `code === 'MANTENIMIENTO'` → `handleMaintenance()`
      (espejo de `handleUnauthorized`, anti-bucle). Discriminar de `STORAGE_*`.

## TAR-3 Pantalla pública

- [x] `src/routes/mantenimiento.tsx` (`createFileRoute('/mantenimiento')`, `ssr:false`, sin guard):
      mensaje/motivo + auto-reintento (al desactivar, vuelve a `/login`).
- [x] `pnpm generate-routes`.

## TAR-4 Botón del `developer`

- [x] `helpers/permissions.ts`: `mantenimiento:put` para el rol `developer`.
- [x] `helpers/nav.ts`: ítem (solo `developer`).
- [x] `src/routes/_app/mantenimiento-admin.tsx`: `Switch` + `motivo`/`mensaje` + confirmación fuerte.

## TAR-5 Docs y verificación

- [x] `documentacion/MAPA.md`: rutas `/mantenimiento` y `/mantenimiento-admin`.
- [x] `npx tsc --noEmit` y `pnpm run build`.
- [ ] E2E (si aplica): redirección con mantenimiento activo y vuelta al desactivar.
      (Pendiente: el backend de la spec 011 aún no está implementado, no hay endpoint que simular.)
