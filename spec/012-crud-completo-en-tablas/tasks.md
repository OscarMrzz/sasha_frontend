# Tareas — `012-crud-completo-en-tablas` (frontend, Fase A)

> Fase A verificada el 2026-10-13: e2e 34 passed / 1 skipped (skip esperado por fixture sin periodo finalizado).

## 1. Preparación / regla
- [x] Confirmar **REG-UI-16** (tabla con «Agregar» ⇒ CRUD completo por fila; la baja lógica cuenta como Eliminar) y **PRD §10.1.7** como criterio de aceptación (ya registrados).
- [x] Verificar que `src/routes/_app/coordinaciones.tsx` cumple (menú Ver + Editar + Desactivar/Activar) y documentarlo.
- [x] Verificar que `src/routes/_app/excusas/index.tsx` cumple (menú Ver + Editar + Desactivar) y documentarlo.

## 2. A-1 Tipos de ficha — agregar "Ver"
- [x] `src/routes/_app/disciplina/tipos.tsx`: ítem «Ver» en `.ctx-menu` (antes de Editar) + estado `ver` y su handler.
- [x] Modal de detalle en modo lectura: prop `soloVer?: boolean` en `src/components/disciplina/TipoFichaModal.tsx` (sin Guardar, footer solo «Cerrar») o `TipoFichaVerModal` nuevo.
- [x] `data-testid="tipos-ficha-ctx-ver"`.
- [x] Ver sin permiso extra (la página exige `tipos_ficha:post`); Editar/Desactivar siguen dentro de `Can permission="tipos_ficha:put"`.

## 3. A-2 Tipos de excusa — agregar "Ver"
- [x] `src/routes/_app/excusas/tipos.tsx`: ítem «Ver» en `.ctx-menu` + estado `ver` y su handler.
- [x] Modal de detalle: prop `soloVer?: boolean` en `src/components/excusas/TipoExcusaModal.tsx` (modo lectura, sin Guardar) o `TipoExcusaVerModal` nuevo.
- [x] `data-testid="tipos-excusa-ctx-ver"`.
- [x] Ver sin permiso extra (la página exige `tipos_excusa:post`); Editar/Desactivar dentro de `Can permission="tipos_excusa:post"`.

## 4. A-3 Notificaciones — Ver real + Desactivar general
- [x] `src/routes/_app/notificaciones-admin.tsx`: «Ver» abre modal de detalle real (nuevo `src/components/notificaciones/NotificacionVerModal.tsx`) en lugar de `toast.info`.
- [x] Detalle muestra: título, mensaje, tipo, estado, fecha de publicación, leída y banner.
- [x] Exponer «Desactivar» para toda fila `ACTIVE` (usa `desactivarNotificacion`), con `ConfirmDialog`; renombrar «Quitar banner»/`quitarMut` a texto genérico («Desactivar notificación»).
- [x] `data-testid="notif-ver"` (modal) y `data-testid="notif-desactivar"` (ítem de menú).
- [x] Desactivar dentro de `Can permission="notificaciones:post"`; Ver sin permiso extra.

## 5. A-4 Pagos — "Anular pago" en el menú
- [x] `src/routes/_app/pagos.tsx`: ítem «Anular pago» (danger) en `.ctx-menu`, visible solo si `estado === 'pagado'`, con `ConfirmDialog`/modal de motivo.
- [x] Extraer `AnularPagoModal` (motivo + `ConfirmDialog`) y reutilizarlo desde el Editar.
- [x] `data-testid="pagos-ctx-anular"` (ítem); `pago-anular-motivo` + `pago-anular` ya existen en el Editar.
- [x] Dentro de `Can permission="pagos:put"` (endpoint `POST /mensualidades/{id}/anular`).

## 6. A-5 Recuperaciones — menú de fila
- [x] `src/routes/_app/recuperaciones.tsx`: `onRowContextMenu` + estado `ctx`; ítems Ver/Editar/Eliminar reusando `RecuperacionModal`.
- [x] Ver con `soloVer` en `src/components/recuperaciones/RecuperacionModal.tsx` (fuerza lectura, sin Guardar).
- [x] Eliminar = vaciar la nota con `ConfirmDialog`; respetar solo-lectura si el periodo está finalizado (menú solo Ver).
- [x] `data-testid="recuperaciones-ctx-ver"`, `recuperaciones-ctx-editar`, `recuperaciones-ctx-eliminar`.
- [x] Ver/Editar/Eliminar dentro de `Can permission="recuperaciones:post"`.

## 7. Verificación
- [x] `pnpm generate-routes`.
- [x] `pnpm exec tsc --noEmit` PASS.
- [x] `pnpm exec eslint` de los archivos tocados PASS.
- [x] e2e Playwright: casos de disciplina/tipos (`disciplina.spec.ts`), excusas/tipos (`excusas.spec.ts`), notificaciones (`notificaciones.spec.ts`, incluye `notif-quitar-banner` → `notif-desactivar`), pagos (`pagos.spec.ts`) y recuperaciones (`recuperaciones.spec.ts`) — añadidos y ejecutados: 34 passed / 1 skipped (skip esperado: «periodo finalizado» por fixture sin periodo cerrado).

## 8. Cierre
- [ ] Preguntar por MAPA (frontend `sasha_fronted/documentacion/MAPA.md` y/o backend) y notas del vault.
- [ ] Registrar decisiones pendientes de Fase B (fichas disciplinarias editar/eliminar, notificaciones Editar `PUT`, plan-estudio Eliminar, detalle con `role_names`/`vigencia_fin`, política de baja lógica vs física).
