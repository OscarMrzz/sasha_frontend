# Plan de Especificación: CRUD completo en tablas — Frontend

> Feature `012-crud-completo-en-tablas` · Frontend Sasha (React 19 + TanStack Start) · v1
> Capa: **frontend** (`sasha_fronted/`). Alinea las páginas de registros con la regla nueva
> **REG-UI-16** (PRD §10.1.7): si una tabla tiene **Agregar**, su menú de fila debe ofrecer
> **Ver · Editar · Eliminar** (la baja lógica —Desactivar/Activar, Anular— cuenta como Eliminar).
> **Fase A** = solo frontend (sin backend). **Fase B** = requiere backend y permisos nuevos `*:delete`
> (decisiones ya tomadas por el usuario; ver §2 y §8).

---

## 1. Objetivo

- Que toda página de registros con botón **Agregar** cumpla REG-UI-16 sin inventar permisos ni endpoints:
  reusar los `put`/`post` ya existentes.
- Cerrar los huecos detectados en el análisis previo: tres tablas solo ofrecían parte del CRUD por fila
  y una no tenía menú de fila.
- Reglas de referencia: [[REG-UI-16 CRUD completo si la tabla permite agregar]],
  [[REG-UI-06 Menu de fila Ver Editar Eliminar]], [[REG-UI-12 Vista de registros por defecto]].

## 2. Alcance

### Fase A (este plan — solo frontend, sin backend)
| # | Ruta | Estado hoy | Cambio Fase A |
|---|---|---|---|
| A-0 | `src/routes/_app/coordinaciones.tsx` | **Cumple**: menú Ver + Editar + Desactivar/Activar (toggle = baja lógica). | Sin código. Solo se documenta que cumple REG-UI-16. |
| A-0 | `src/routes/_app/excusas/index.tsx` | **Cumple**: menú Ver + Editar + Desactivar (baja lógica). | Sin código. Solo se documenta que cumple REG-UI-16. |
| A-1 | `src/routes/_app/disciplina/tipos.tsx` | Menú Editar + Desactivar/Activar (`~140-162`). **Falta Ver.** | Agregar ítem **Ver** (modal de detalle en modo lectura). |
| A-2 | `src/routes/_app/excusas/tipos.tsx` | Menú Editar + Desactivar/Activar (`~89-111`). **Falta Ver.** | Agregar ítem **Ver** (modal de detalle en modo lectura). |
| A-3 | `src/routes/_app/notificaciones-admin.tsx` | «Ver» = `toast.info(mensaje)` (`~128-137`) y «Quitar banner» solo si `es_banner` (`~138-150`). | (a) **Ver** abre modal de detalle real; (b) **Desactivar** para toda fila `ACTIVE` (no solo banners). |
| A-4 | `src/routes/_app/pagos.tsx` | Menú Ver/Editar/Registrar; «Anular pago» solo dentro del Editar (`~317-327`). | Agregar ítem **Anular pago** (danger) al menú, visible solo si `estado === 'pagado'`. |
| A-5 | `src/routes/_app/recuperaciones.tsx` | Tabla **sin** menú de fila (`~112-130`). | Agregar `onRowContextMenu` con **Ver · Editar · Eliminar** (Eliminar = vaciar la recuperación). |

### Fase B (requiere backend — decisiones ya tomadas)
| # | Página | Cambio Fase B | Backend requerido |
|---|---|---|---|
| B-1 | **Fichas disciplinarias** (`src/routes/_app/disciplina/index.tsx`) | La tabla pasa a **una fila por ficha** (deja de ser agregado por alumno). Cada fila con menú **Ver · Editar · Eliminar** (CRUD real por ficha). | Listado de fichas **no agregado**; `PUT /disciplina/fichas/{id}` y `DELETE /disciplina/fichas/{id}`. Recálculo de nivel/vez/sanción al editar/eliminar. |
| B-2 | **Plan de estudio** (maestro, `src/routes/_app/plan-estudio.tsx`) | Agregar **Eliminar** (físico), permitido **solo al creador** del plan. | `DELETE /planestudio/{id}` + validación de propiedad (creador). |
| B-3 | **Notificaciones** (`src/routes/_app/notificaciones-admin.tsx`) | **Dos acciones distintas**: **Desactivar** (temporal, ya existe `POST /notificaciones/{id}/desactivar`) y **Eliminar** (definitivo, nueva). «Editar» también pedido. | `DELETE /notificaciones/{id}` y `PUT /notificaciones/{id}`. |
| B-4 | **Pagos** | **Anular = Eliminar** (confirmado). No hay delete físico. | Ya cubierto en Fase A (A-4). |
| B-5 | **Permisos** | Se crean permisos nuevos `*:delete` (p. ej. `fichas:delete`, `planestudio:delete`, `notificaciones:delete`), separados de «Editar». | Registrar en el **seed de la BD** (`db_sasha`) y en `src/helpers/permissions.ts`; repartibles en **Controladores**. |
| B-6 | **Detalle de notificación** | Mostrar `role_names` y `vigencia_fin` en el modal Ver. | Exponerlos en el listado admin o GET de detalle (hoy `GET /notificaciones/` no los devuelve). |

## 3. Permisos

- **Fase A: solo se reutilizan permisos existentes** (`put`/`post`). **No se crea ningún `*:delete` en la Fase A.**
- **Fase B: sí se crean permisos `*:delete`** (decisión Opción B), separados de «Editar», en seed + `permissions.ts`.
- A-1 `disciplina/tipos.tsx`: Ver sin permiso extra (la página exige `tipos_ficha:post`); Editar/Desactivar ya dentro de `Can permission="tipos_ficha:put"`.
- A-2 `excusas/tipos.tsx`: Ver sin permiso extra (la página exige `tipos_excusa:post`); Editar/Desactivar dentro de `Can permission="tipos_excusa:post"`.
- A-3 `notificaciones-admin.tsx`: Ver sin permiso extra (RequirePermission `notificaciones:post`); Desactivar con `Can permission="notificaciones:post"` (endpoint `POST /notificaciones/{id}/desactivar` ya protegido con `post`).
- A-4 `pagos.tsx`: «Anular pago» dentro de `Can permission="pagos:put"` (endpoint `POST /mensualidades/{id}/anular` protegido con `put`).
- A-5 `recuperaciones.tsx`: Ver/Editar/Eliminar con `Can permission="recuperaciones:post"` (el `PUT /recuperaciones/` está protegido con `post`).

## 4. Archivos a tocar

| Archivo | Cambio |
|---|---|
| `src/routes/_app/disciplina/tipos.tsx` | Ítem **Ver** en `.ctx-menu` (antes de Editar) que abre modal de detalle; agregar estado `ver` + `TipoFichaVerModal`. |
| `src/components/disciplina/TipoFichaModal.tsx` | Agregar prop opcional `soloVer?: boolean` → render de solo lectura (reusa `Seccion`, sin `Guardar`, footer solo «Cerrar»). Alternativa: componente nuevo `TipoFichaVerModal`. |
| `src/routes/_app/excusas/tipos.tsx` | Ítem **Ver** en `.ctx-menu`; estado `ver` + `TipoExcusaVerModal`. |
| `src/components/excusas/TipoExcusaModal.tsx` | Prop opcional `soloVer?: boolean` → modo lectura (sin input editable ni Guardar). Alternativa: `TipoExcusaVerModal`. |
| `src/routes/_app/notificaciones-admin.tsx` | Reemplazar `toast.info` por modal `NotificacionVerModal`; exponer **Desactivar** para toda fila `ACTIVE` (usa `desactivarNotificacion`); renombrar `quitar`/`quitarMut` a texto genérico («Desactivar notificación»). |
| `src/components/notificaciones/NotificacionVerModal.tsx` (nuevo) | Modal de detalle (título, mensaje, tipo, estado, fecha de publicación, leída, banner). |
| `src/routes/_app/pagos.tsx` | Ítem **Anular pago** (danger) en `.ctx-menu`, visible si `estado==='pagado'`; extraer `AnularPagoModal` (motivo + `ConfirmDialog`) reutilizado por el Editar. |
| `src/routes/_app/recuperaciones.tsx` | `onRowContextMenu` + estado `ctx`; menú Ver/Editar/Eliminar; `ConfirmDialog` de eliminar (vaciar nota). |
| `src/components/recuperaciones/RecuperacionModal.tsx` | Prop opcional `soloVer?: boolean` para el ítem Ver (fuerza lectura, sin Guardar). |
| `src/tests/e2e/disciplina.spec.ts` | Nuevo caso: clic derecho en un tipo → **Ver** abre el modal de detalle. |
| `src/tests/e2e/excusas.spec.ts` | Nuevo caso: clic derecho en un tipo → **Ver** abre el modal de detalle. |
| `src/tests/e2e/notificaciones.spec.ts` | Ajustar: «Quitar banner» pasa a «Desactivar»; nuevo caso de Ver y de Desactivar sobre un aviso no-banner; `notif-quitar-banner` → `notif-desactivar`. |
| `src/tests/e2e/pagos.spec.ts` | Nuevo caso: fila pagada → menú **Anular pago** + `ConfirmDialog` (y que no aparece en filas pendiente/mora). |
| `src/tests/e2e/recuperaciones.spec.ts` | Nuevo caso: menú de fila Ver/Editar/Eliminar; Eliminar vacía la nota; con periodo finalizado solo Ver. |

## 5. UI

- **Menú de fila**: contenedor `.ctx-menu` con botones `.ctx-menu__item` (danger = `.ctx-menu__item--danger`),
  abierto vía `onRowContextMenu`, cerrado con `closeCtx` (patrón ya usado en las 5 páginas). Sin degradados.
- **Confirmación de baja**: `ConfirmDialog` (`src/components/ui/ConfirmDialog.tsx`) en Desactivar/Anular/Eliminar.
- **Modal de detalle**: `Modal` (`src/components/ui/Modal.tsx`) con `useDismiss`; reusa clases `expediente`,
  `ficha__grid`, `texto-muted`. El detalle es de solo lectura (footer solo «Cerrar»).
- **`data-testid`** (convención existente):
  - A-1: `tipos-ficha-ctx-ver`; A-2: `tipos-excusa-ctx-ver`.
  - A-3: `notif-ver` (modal), `notif-desactivar` (ítem de menú).
  - A-4: `pagos-ctx-anular` (ítem), `pago-anular-motivo` + `pago-anular` (modal, ya existen en el Editar).
  - A-5: `recuperaciones-ctx-ver`, `recuperaciones-ctx-editar`, `recuperaciones-ctx-eliminar`.
- Doble clic mantiene el comportamiento actual (abre Editar/Ver); no se cambia.

## 6. Regla aplicada

- **REG-UI-16**: tabla con «Agregar» ⇒ CRUD completo por fila; la baja lógica (Desactivar/Activar, Anular,
  vaciar nota) **cuenta como Eliminar** pero debe ser alcanzable desde el menú de fila.
- **REG-UI-06**: menú por fila Ver · Editar · Eliminar; Ver = modal de detalle; Eliminar = diálogo de confirmación.
- **REG-UI-12**: estilo de registros (`DataTable` con buscador «Buscar…», filtros, Agregar, conteo en el título).
- Sin permisos nuevos: se reutilizan `put`/`post` (§3).

## 7. Tests

- `pnpm generate-routes` (no se crean rutas nuevas; se corre para validar el árbol).
- `tsc --noEmit`.
- `eslint`.
- e2e (Playwright): actualizar/añadir los casos listados en §4.
  - A-1/A-2: abrir el **Ver** y verificar el contenido del modal de detalle.
  - A-3: **Ver** abre modal; **Desactivar** sobre fila `ACTIVE` no-banner la pasa a inactiva; banner sigue funcionando.
  - A-4: **Anular pago** visible solo en `pagado`; confirma y el mes pasa a pendiente/mora.
  - A-5: **Eliminar** vacía la nota de la fila; con `finalizado` el menú no ofrece Editar/Eliminar.
- Los e2e requieren backend + DB local; si no están disponibles, se documenta y se deja como no ejecutable.

## 8. Decisiones tomadas (Fase B)

1. **Fichas disciplinarias**: la tabla se convierte en **una fila por ficha** (no un agregado por alumno); el CRUD (Ver/Editar/Eliminar) es **por fila/ficha**. Eliminar = **baja normal (física)**, permitida **solo a quien creó la ficha**. Requiere listado no agregado + `PUT`/`DELETE /disciplina/fichas/{id}`. Recálculo de nivel/vez/sanción a definir en la spec backend.
2. **Plan de estudio (maestro)**: **Eliminar físico**, permitido **solo al creador**. Requiere `DELETE /planestudio/{id}` con validación de propiedad.
3. **Notificaciones**: **Desactivar** y **Eliminar** son **acciones distintas** → se ofrecen ambas. «Editar» también se pidió. Requiere `DELETE` y `PUT`.
4. **Pagos**: **Anular = Eliminar** (confirmado); sin delete físico.
5. **Permisos (Opción B)**: «Eliminar» será un **permiso propio** (`*:delete`), **separado de «Editar»**, registrado en el **seed** y en `permissions.ts`, y repartible en **Controladores**.
6. **Fase B es full-stack** → requiere una **spec de backend** aparte (`backend_sasha/spec/00X-...`) y, al registrar los `*:delete` en el seed, **una migración/actualización de seed**.

## 9. Cierre

- Al terminar la Fase A **preguntar** si se actualizan los **MAPA** (frontend `sasha_fronted/documentacion/MAPA.md`
  y/o backend) y si las notas del **vault** (`Trabajo/Paneles`, `Trabajo/Tareas`, `Trabajo/Sesiones`) se marcan.
  No editar MAPA ni vault en silencio.
- Registrar como `DEC-`/`CON-` del vault las decisiones de Fase B cuando se tomen.
- **Fase A**: este plan **no** crea migraciones (solo-frontend) y **no** introduce endpoints ni permisos nuevos.
- **Fase B**: es **full-stack**; creará endpoints nuevos, permisos `*:delete` (→ **migración/seed en `db_sasha`**) y requerirá una **spec de backend** propia.
