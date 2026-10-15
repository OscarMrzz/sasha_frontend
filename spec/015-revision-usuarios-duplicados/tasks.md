# Checklist de Tareas: Prevención y revisión de usuarios duplicados — Frontend (`015`)

> Desglose atómico derivado de [`plan.md`](./plan.md). Frontend Sasha (React 19 + TanStack Start).
> **Fase A** (prevención) primero, luego **Fase B** (página Duplicados). Consume los endpoints del
> backend `backend_sasha/spec/007-prevencion-y-revision-usuarios-duplicados`.
>
> **Convenciones:** estado inicial todas sin marcar (`- [ ]`); cada tarea indica **Archivo(s)**,
> **Qué** y **Verifica**. Reglas `REG-UI-11/12/01/04/06/14`. Comandos en `sasha_fronted/`.

---

## Bloque 1: Fase A — Poka-Yoke y idempotencia

- [ ] **T01 — `apiRequest` acepta cabeceras extra**
  - **Archivo(s):** `src/lib/api.ts`.
  - **Qué:** permitir `headers?: Record<string,string>` que se sumen a los ya calculados (para
    `Idempotency-Key`). No cambiar el comportamiento por defecto. Plan §3.2, §4.
  - **Verifica:** `tsc --noEmit`; una llamada con `headers` envía la cabecera.

- [ ] **T02 — `createUser` con `Idempotency-Key` + `chequearDuplicado`**
  - **Archivo(s):** `src/services/users.ts`.
  - **Qué:** `createUser(body, idempotencyKey?)` que envía `Idempotency-Key`; `chequearDuplicado(params)`
    → `GET /users/chequear-duplicado`. Tipos del contrato. Plan §3.2, §3.3, §5.
  - **Verifica:** `tsc --noEmit`; la petición lleva la cabecera; `chequearDuplicado` devuelve el shape.

- [ ] **T03 — `usuarios.tsx`: Poka-Yoke + clave idempotente + aviso**
  - **Archivo(s):** `src/routes/_app/usuarios.tsx`.
  - **Qué:** (1) `confirmDisabled={createMut.isPending}` en el `ConfirmDialog` de alta; (2)
    `setConfirmSave(false)` en `onError`; (3) generar UNA `Idempotency-Key` por intento (en el estado,
    reusada en el reintento) y pasarla a `createUser`; (4) `chequearDuplicado` antes de crear → si
    `existe`, `ConfirmDialog` de aviso "Crear igual"/"Cancelar". Plan §3.1, §3.2, §3.3.
  - **Verifica:** clic rápido repetido → una sola petición; con clave, dos altas no crean dos cuentas;
    con misma persona+rol aparece el aviso y "Cancelar" no crea.

- [ ] **T04 — `matricula.tsx` (reingreso): Poka-Yoke**
  - **Archivo(s):** `src/routes/_app/matricula.tsx`.
  - **Qué:** `confirmDisabled={reingresoMut.isPending}` en el `ConfirmDialog` y `disabled` en el botón
    "Confirmar reingreso". Plan §3.1.
  - **Verifica:** doble clic en reingreso no dispara dos matrículas.

- [ ] **T05 — `MatriculaWizard.tsx`: clave idempotente por alta**
  - **Archivo(s):** `src/components/matricula/MatriculaWizard.tsx`.
  - **Qué:** al confirmar, generar una `Idempotency-Key` por cada `createUser` (alumno y cada
    responsable) y reusarla si el usuario reintenta tras un fallo (evita duplicar lo ya creado). El
    bloqueo de doble submit ya existe (`confirmDisabled`). Plan §3.1, §3.2.
  - **Verifica:** fallo a mitad + reintento no crea un segundo alumno.

## Bloque 2: Fase B — Servicio y ruta de la página

- [ ] **T06 — Servicio `duplicados.ts`**
  - **Archivo(s):** `src/services/duplicados.ts` (nuevo).
  - **Qué:** `listGruposDuplicados(params)`, `detalleGrupo(clave)`, `desactivarCuenta(code)`,
    `reactivarCuenta(code)` con `apiRequest`/`apiRequestList`. Tipos del §5 del plan. Plan §4, §5.
  - **Verifica:** `tsc --noEmit`; funciones exportadas con los tipos correctos.

- [ ] **T07 — Ruta y registro en menú/permissions**
  - **Archivo(s):** `src/routes/_app/duplicados.tsx` (nuevo), `src/helpers/nav.ts`,
    `src/components/layout/nav-icons.tsx`, `src/helpers/permissions.ts`.
  - **Qué:** crear la ruta `/_app/duplicados`; ítem en `NAV_ITEMS` con `permission:'users:get'` e icono;
    verificar que `users:get` existe para los roles de gestión (si falta, agregarlo). Plan §4.
  - **Verifica:** `pnpm generate-routes`; la ruta aparece en el sidebar para admin; otro rol sin permiso
    ve `No tienes permiso`.

## Bloque 3: Fase B — Página (DataTable)

- [ ] **T08 — Página `duplicados.tsx`: DataTable estilo registros (REG-UI-12)**
  - **Archivo(s):** `src/routes/_app/duplicados.tsx`.
  - **Qué:** `RequirePermission permission="users:get"`; `DataTable` con `title="Duplicados"`
    (conteo), buscador, filtros (rol, estado, señal, min versiones), Descargar Excel/PDF
    (`exportRows`+`exportFilename`); columnas del §3.4; orden por defecto versiones↓/vínculos↓/fecha↓;
    `data-testid="duplicados-page"`. Plan §3.4.
  - **Verifica:** `tsc --noEmit`; la tabla muestra grupos, filtros, export y conteo en el título.

- [ ] **T09 — Menú de fila "Inspeccionar"**
  - **Archivo(s):** `src/routes/_app/duplicados.tsx`.
  - **Qué:** `.ctx-menu` con **Inspeccionar** (`duplicados-ctx-inspeccionar`); doble clic abre
    Inspeccionar. Plan §3.4, REG-UI-06.
  - **Verifica:** clic derecho y doble clic abren la inspección del grupo correcto.

## Bloque 4: Fase B — Vista de inspección

- [ ] **T10 — Modal de inspección en paralelo (A/B/C)**
  - **Archivo(s):** `src/routes/_app/duplicados.tsx` (+ CSS de rejilla en `src/styles/` si hace falta).
  - **Qué:** `Modal board` con rejilla de tarjetas por versión; etiqueta A/B/C; badge verde
    "Se recomienda conservar" / rojo "Se recomienda eliminar" (tokens, **sin degradados**); datos +
    desglose de vínculos + `total_vinculos`; 1 columna en pantallas pequeñas. Plan §3.5.
  - **Verifica:** al Inspeccionar se ven todas las versiones lado a lado con badges según recomendación.

- [ ] **T11 — Eliminar cuenta + "Conservar todas"**
  - **Archivo(s):** `src/routes/_app/duplicados.tsx`.
  - **Qué:** botón **"Eliminar cuenta"** por tarjeta (`dup-eliminar-<etiqueta>`) con
    `ConfirmDialog danger` (reforzado si es la recomendada a conservar) → `desactivarCuenta(code)` →
    refrescar grupo; **409** muestra el vínculo bloqueante en `Modal` "No se puede eliminar".
    Botón **"Conservar todas"** (`dup-conservar-todas`) cierra sin cambios. Plan §3.5.
  - **Verifica:** eliminar la vacía la desactiva y el grupo desaparece si queda <2; conservar-todas no
    cambia nada; un 409 muestra el motivo.

## Bloque 5: Tests y verificación

- [ ] **T12 — e2e `duplicados.spec.ts`**
  - **Archivo(s):** `src/tests/e2e/duplicados.spec.ts` (nuevo).
  - **Qué:** (1) doble submit del alta → una sola cuenta; (2) aviso de duplicado aparece y "Cancelar"
    no crea; (3) página Duplicados: sembrar 2 cuentas iguales → fila visible; Inspeccionar muestra
    A/B/C con badges; eliminar la vacía la desactiva; "Conservar todas" no cambia. Usar `loginAs` y
    `data-testid`. Plan §7.
  - **Verifica:** los casos pasan con backend `:8081` + DB `molde_test` (o se documenta no ejecutado).

- [ ] **T13 — Verificación global**
  - **Comandos:** `pnpm generate-routes`; `pnpm exec tsc --noEmit`; `pnpm exec eslint <archivos>`.
  - **Verifica:** PASS (sin errores nuevos).

## Bloque 6: Cierre

- [ ] **T14 — Preguntar por MAPA frontend (no editar en silencio)**
  - **Archivo(s):** `sasha_fronted/documentacion/MAPA.md`.
  - **Qué:** preguntar si se actualiza por la ruta `/duplicados` y los cambios de alta. Plan §9.
  - **Verifica:** confirmación del usuario.

- [ ] **T15 — Avisar que no requiere migración (la del backend es `060`)**
  - **Verifica:** el reporte final lo declara.

---

## Resumen por bloque

| Bloque | Contenido | Tareas |
|---|---|---|
| 1 | Fase A: Poka-Yoke + idempotencia + aviso | T01–T05 |
| 2 | Fase B: servicio y ruta | T06–T07 |
| 3 | Fase B: DataTable | T08–T09 |
| 4 | Fase B: vista de inspección | T10–T11 |
| 5 | Tests y verificación | T12–T13 |
| 6 | Cierre | T14–T15 |
| **Total** | | **15** |
