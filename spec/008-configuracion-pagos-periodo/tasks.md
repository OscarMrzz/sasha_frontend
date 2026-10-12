# Checklist de Tareas: Configuración de pagos por periodo — Frontend

> Desglose atómico derivado de [`plan.md`](./plan.md). Feature **008-configuracion-pagos-periodo** · capa **frontend** (`sasha_fronted/`).
> Todos los comandos se ejecutan en `sasha_fronted/`.
>
> **Convenciones del checklist**
> - Estado inicial: todas las casillas sin marcar (`- [ ]`).
> - Cada tarea indica **Archivo(s)**, **Qué** y **Verifica**.
> - Orden por dependencia: servicio y tipos → helpers → permisos/nav → componentes → página → estilos → rutas/validación → e2e → documentación → verificación.
> - Reglas Sasha: **sin degradados** (REG-UI-01); buscador «Buscar…» fijo (REG-UI-11); listado con estilo registros (REG-UI-12); formulario en `Modal` con `useDismiss` + `ConfirmDialog` (REG-UI-04).
> - Tareas marcadas **⛔ BLOQUEADA** dependen de una **decisión abierta** del plan (§Decisiones abiertas) y no deben empezarse hasta confirmarla; su dependencia se indica entre paréntesis.
> - Se **crea una ruta nueva**; `pnpm generate-routes` regenera `src/routeTree.gen.ts` (no se edita a mano).

---

## Fase 0: Preparación

- [ ] **T01 — Congelar puntos de anclaje y contratos de tipos**
  - **Archivo(s):** `src/routes/_app/catalogos/periodos.tsx`, `src/components/catalogos/ParcialesPeriodoForm.tsx`, `src/components/disciplina/TipoFichaModal.tsx`, `src/components/ui/Modal.tsx`, `src/components/ui/ConfirmDialog.tsx`, `src/components/ui/DataTable.tsx`, `src/services/catalogos.ts`, `src/services/pagos.ts`, `src/lib/api.ts` (lectura).
  - **Qué:** releer el plan §3–§9 y confirmar las firmas reales que se van a tocar: patrón de página de registros de `periodos.tsx` (`DataTable` + `confirmSave` + `dirty`/`snapshot`), patrón de filas repetibles de `TipoFichaModal`/`ParcialesPeriodoForm` (`nivelSeq`, `.niveles`, `.nivel-fila`, `+ Agregar`, `Trash2`), props reales de `Modal` (`useDismiss`, `xl`) y `ConfirmDialog`, y tipos actuales de `Periodo`/`Grado`. Confirmar la firma de `apiRequest`. No escribir código aún.
  - **Verifica:** nota de reconocimiento con los nombres reales de helpers, estados y `data-testid`; sin comandos (tarea de lectura).

## Fase 1: Servicio y tipos

- [ ] **T02 — Crear `src/services/pagos-config.ts`** (⛔ BLOQUEADA por decisión abierta #5: archivo nuevo vs ampliar `pagos.ts`)
  - **Archivo(s):** `src/services/pagos-config.ts` (nuevo).
  - **Qué:** definir los tipos `ReglaMora` (`{ dias, monto }`), `ConfigGrado` (`{ grado_id, grado_nombre, monto, reglas_mora }`), `ConfiguracionPagos` (`{ periodo_id, dia_pago, dia_mora, grados }`) y `ConfiguracionPagosUpdate` (`{ dia_pago, dia_mora, retroactivo, grados }`); implementar `getConfiguracionPagos(periodoId)` → `apiRequest<ConfiguracionPagos>('/pagos/configuracion/{id}')` y `updateConfiguracionPagos(periodoId, body)` → `apiRequest<ConfiguracionPagos>('/pagos/configuracion/{id}', { method: 'PUT', body })`, con `encodeURIComponent(periodoId)`. **No** tocar `src/services/pagos.ts` (salvo que la decisión #5 lo indique).
  - **Verifica:** `pnpm build` compila; los endpoints, métodos y tipos coinciden con el contrato §4 del plan.

## Fase 2: Helpers puros

- [ ] **T03 — Crear `src/helpers/configuracion-pagos.ts`**
  - **Archivo(s):** `src/helpers/configuracion-pagos.ts` (nuevo).
  - **Qué:** implementar funciones puras: `diasOptions()` (opciones 1–31), `montoSeguro(v)` (vacío/negativo → `0`), `validarConfiguracion(form)` (todo monto de grado ≥ 0; `dia_pago`/`dia_mora` ∈ [1,31]; reglas con `dias` ≥ 1 entero; **sin duplicado de `dias` dentro del mismo grado**; devuelve errores por grado/campo); `configToForm(config, grados)` (fusió de `grados` del `GET` con el catálogo para precargar todos los grados con `monto 0` y `reglas_mora []`, días/montos como texto) y `formToPayload(form, retroactivo)` (texto → número; normaliza vacíos). Definir también `ReglaMoraForm { key, dias, monto }` y `GradoConfigForm { grado_id, grado_nombre, monto, reglas_mora }`. Sin efectos secundarios. (Depende del formato de la lista de reglas, decisión abierta #9.)
  - **Verifica:** `pnpm lint` sin errores; revisión de que `diasOptions()` da 31 ítems, `montoSeguro('') === 0`, y `validarConfiguracion` detecta `dias` duplicados y montos negativos.

## Fase 3: Permisos y navegación

- [ ] **T04 — Permisos `pagos_config:get` / `pagos_config:put` en `src/helpers/permissions.ts`** (⛔ BLOQUEADA por decisión abierta #2: roles con el permiso)
  - **Archivo(s):** `src/helpers/permissions.ts`.
  - **Qué:** añadir `pagos_config:get` y `pagos_config:put` a `ROLE_PERMISSIONS` de `contabilidad` (y, según decisión abierta #2, a `admin`/`admin_temporal`). Sin esto `Can`/`RequirePermission`/`useCan` no reconocen el permiso nuevo. No depende de `/me`.
  - **Verifica:** `pnpm build` compila; `useCan('pagos_config:get')` es `true` para `contabilidad` y `false` para un rol sin él.

- [ ] **T05 — Ítem de navegación en `src/helpers/nav.ts`** (⛔ BLOQUEADA por decisiones abiertas #10 icono/label y #1 nombre de ruta)
  - **Archivo(s):** `src/helpers/nav.ts`.
  - **Qué:** añadir a `NAV_ITEMS` un ítem `{ to: '/configuracion-pagos', label: 'Configuración de pagos', permission: 'pagos_config:get', icon: <a confirmar> }`, ubicado junto a `Pagos`/`Recibos`. No usar `hideForRoles` (el gating ya es por permiso).
  - **Verifica:** `pnpm build` compila; el ítem aparece solo para roles con `pagos_config:get` (contabilidad) y respeta la ruta definitiva.

## Fase 4: Componentes

- [ ] **T06 — Crear `src/components/pagos/ReglasMoraGrado.tsx`** (⛔ BLOQUEADA por decisión abierta #4: ubicación de carpeta)
  - **Archivo(s):** `src/components/pagos/ReglasMoraGrado.tsx` (nuevo).
  - **Qué:** sub-componente **controlado** de reglas de mora de un grado, props `value: ReglaMoraForm[]`, `onChange`, `disabled`. Clonar el patrón de `ParcialesPeriodoForm`/`TipoFichaModal`: lista `.niveles` de filas `.nivel-fila` con `key` temporal (patrón `nivelSeq`), input **días** («N días o más», `type=number`, `min=1`) e input **monto** (`type=number`, `min=0`), botón **+ Agregar** (`Plus`) y quitar por fila (`Trash2`, `.nivel-fila__quitar`). `data-testid`: `pagos-config-agregar-regla-{gradoId}`, `pagos-config-regla-{gradoId}-{i}`, `pagos-config-regla-{gradoId}-{i}-dias`, `pagos-config-regla-{gradoId}-{i}-monto`, `pagos-config-regla-{gradoId}-{i}-quitar`.
  - **Verifica:** `pnpm build` compila; agrega/quita filas sin salir del modal y reindexa `key`s correctamente.

- [ ] **T07 — Crear `src/components/pagos/ConfiguracionPagosModal.tsx`** (⛔ BLOQUEADA por decisiones abiertas #4 ubicación, #6 textos/labels, #7 detección de «ya existía config»)
  - **Archivo(s):** `src/components/pagos/ConfiguracionPagosModal.tsx` (nuevo).
  - **Qué:** `Modal xl` con `useDismiss(onClose)` y props `periodo`/`onClose`. Cargar con `useQuery(['pagos-config', periodoId], enabled: open && Boolean(periodo?.id))` → `getConfiguracionPagos`; estados de **carga** («Cargando configuración…») y **error** (`toast.error(userMessageFromError(e))`, modal reintentable, no se cierra). Estado `form` con `dia_pago`/`dia_mora` (selects 1–31 vía `diasOptions()`), **card por grado** (`pagos-config-grado-{gradoId}`) con input **Monto a pagar** (`pagos-config-monto-{gradoId}`) y sub-sección `ReglasMoraGrado`; nota de texto-muted explicando reglas **acumulativas**. Validación con `validarConfiguracion` (`pagos-config-error`); `dirty` = `snapshot(form) !== baseline`; `Guardar` (`pagos-config-save-button`) `disabled` si error, `!dirty` o `isPending`. Dos `ConfirmDialog`: `pagos-config-confirm` (guardar) y `pagos-config-retroactivo` (Sí/No, solo en edición de config existente). `data-testid` de días: `pagos-config-dia-pago`, `pagos-config-dia-mora`; raíz `pagos-config-modal`. Modo ver (si aplica) solo `Cerrar`. Confirmación de descarte al cerrar con `dirty`.
  - **Verifica:** `pnpm build` compila; abrir el modal muestra un select por día y una card por cada grado; en config nueva el `PUT` va con `retroactivo: false` sin la segunda pregunta; en edición aparece `pagos-config-retroactivo`.

## Fase 5: Página

- [ ] **T08 — Crear `src/routes/_app/configuracion-pagos.tsx`** (⛔ BLOQUEADA por decisiones abiertas #1 nombre de ruta y #8 acceso de contabilidad a `GET /catalogos/periodos`)
  - **Archivo(s):** `src/routes/_app/configuracion-pagos.tsx` (nuevo).
  - **Qué:** ruta nueva bajo `_app`, envuelta en `<RequirePermission permission="pagos_config:get">` (muestra «No tienes permiso `pagos_config:get`»). Espeja `catalogos/periodos.tsx`: `useQuery(['periodos'], listPeriodos)` + `DataTable` con `title` «Configuración de pagos» con **conteo**, buscador «Buscar…», filtros (Año lectivo, Estado), Descargar (Excel/PDF, `exportRows`, `exportFilename="configuracion-pagos"`) y **acción por fila** «Configurar pagos» (`config-pagos-btn-{periodoId}`, `config-pagos-row-{periodoId}`) más opción del menú contextual (`config-pagos-ctx-{periodoId}`, `onRowContextMenu`), envuelta en `<Can permission="pagos_config:get">`. Montar `<ConfiguracionPagosModal periodo={periodoActivo} onClose={...} />`; invalidar `['pagos-config', periodoId]` al guardar; toast de éxito.
  - **Verifica:** `pnpm build` compila; contabilidad ve la tabla de periodos con conteo y buscador; sin permiso ve el mensaje de `RequirePermission`; el botón abre el modal.

## Fase 6: Estilos

- [ ] **T09 — Ajustar BEM de configuración de pagos en `src/styles/style1.css`**
  - **Archivo(s):** `src/styles/style1.css`.
  - **Qué:** reutilizar `.ficha-form`, `.expediente__seccion`, `.expediente__titulo`, `.niveles`, `.nivel-fila`, `.nivel-fila__quitar`, `.niveles__pie`, `.periodo-reglas`, `.periodo-reglas__titulo`; añadir contenedores solo si el layout lo pide (`.pagos-config`, `.pagos-config__grado`, `.pagos-config__dias`, `.mora-regla`, `.mora-regla__pie`). Usar tokens (`--sasha-*`). **Sin degradados** (REG-UI-01); no alterar el placeholder «Buscar…».
  - **Verifica:** `pnpm build` compila; la sección se ve consistente con «Nuevo tipo de ficha» en dark y light, sin degradados.

## Fase 7: Rutas y validación del frontend

- [ ] **T10 — Regenerar rutas y validar el frontend**
  - **Archivo(s):** `src/routeTree.gen.ts` (generado); `—` (verificación).
  - **Qué:** ejecutar `pnpm generate-routes` (se **crea una ruta nueva**; el árbol se regenera, no se edita a mano) y luego `pnpm lint` y `pnpm build`.
  - **Verifica:** `pnpm generate-routes` sin error e incluye la ruta nueva; `pnpm lint` y `pnpm build` sin errores.

## Fase 8: E2E Playwright

- [ ] **T11 — Crear `src/tests/e2e/configuracion-pagos.spec.ts`**
  - **Archivo(s):** `src/tests/e2e/configuracion-pagos.spec.ts` (nuevo), usando `loginAs` de `src/tests/e2e/fixtures/auth.ts` con el usuario de contabilidad `1002026603` (`Admin123!`, patrón de `pagos.spec.ts`).
  - **Qué:** `test.describe('configuracion-pagos @critical')` con datos únicos (`Date.now()`), esperando la tabla con `timeout: 15_000`. Cubrir: (1) acceso y listado (conteo `table-row-count`, buscador «Buscar…», filas de periodos); (2) sin permiso → mensaje «No tienes permiso `pagos_config:get`»; (3) abrir modal con `config-pagos-btn-{periodoId}` y ver `pagos-config-dia-pago`/`pagos-config-dia-mora`; (4) seleccionar días y escribir monto > 0; (5) reglas de mora: dos `+ Agregar`, rellenar `1→100` y `5→200`, quitar una y verificar; (6) validación: dos reglas con mismo `dias` → `pagos-config-error` y `pagos-config-save-button` deshabilitado; (7) guardar nueva → `pagos-config-confirm` → **no** aparece `pagos-config-retroactivo` → toast + persistencia al reabrir; (8) editar con **Sí** retroactivo (verificar `retroactivo: true`); (9) editar con **No** retroactivo (verificar `retroactivo: false`); (10) dirty: Guardar sin cambios deshabilitado y cierre con cambios pide confirmación de descarte.
  - **Verifica:** `pnpm test:e2e src/tests/e2e/configuracion-pagos.spec.ts` → PASS.

- [ ] **T12 — Correr el e2e de configuración de pagos**
  - **Archivo(s):** `—` (verificación).
  - **Qué:** levantar el backend de pruebas (`go run ./cmd/resetdb` + backend contra `molde_test`, según `MAPA.md`) y ejecutar `pnpm test:e2e src/tests/e2e/configuracion-pagos.spec.ts`. Si se toca `data_test.sql` (periodos/grados/usuarios), actualizar `Zettels/TEC-DB-04 Mapa del fixture data_test.md`.
  - **Verifica:** el spec pasa completo; registrar y corregir cualquier fallo antes de cerrar.

## Fase 9: Documentación

- [ ] **T13 — Actualizar `documentacion/MAPA.md`**
  - **Archivo(s):** `documentacion/MAPA.md`.
  - **Qué:** añadir la fila de la ruta nueva `/configuracion-pagos` (contabilidad, `pagos_config:get`): `DataTable` de periodos y modal de días/montos por grado/reglas de mora con flujo de retroactivo; reflejar cambios de `nav.ts`/`permissions.ts`/`routeTree.gen.ts`; mencionar el acceso desde `/catalogos/periodos` **solo si** se aprueba la decisión abierta #3. **Preguntar** antes de editar (regla MAPA).
  - **Verifica:** la ruta queda descrita; confirmación del usuario registrada.

- [ ] **T14 — Actualizar `documentacion/API_CLIENTES.md`**
  - **Archivo(s):** `documentacion/API_CLIENTES.md`.
  - **Qué:** añadir el bloque `Configuración de pagos` con `GET /pagos/configuracion/{periodo_id}` y `PUT /pagos/configuracion/{periodo_id}` según el contrato §4 del plan.
  - **Verifica:** el dominio documentado refleja el contrato nuevo.

- [ ] **T15 — Actualizar `documentacion/prd.md`**
  - **Archivo(s):** `documentacion/prd.md`.
  - **Qué:** registrar que el día de pago, el día de mora y el monto por grado (con recargos por retraso) son configurables por periodo.
  - **Verifica:** PRD sin referencias obsoletas.

- [ ] **T16 — Actualizar `documentacion/EVOLUCION.md`**
  - **Archivo(s):** `documentacion/EVOLUCION.md`.
  - **Qué:** añadir la entrada de la pantalla de configuración de pagos por periodo (nueva ruta, permiso `pagos_config:*`).
  - **Verifica:** entrada de evolución redactada y fechada.

- [ ] **T17 — Cierre y regla MAPA**
  - **Archivo(s):** `—` (coordinación).
  - **Qué:** confirmar con el usuario que los MAPA quedan actualizados solo con aprobación y si van en el commit; preparar el bloque **Resumen** final (qué se hizo, capas tocadas, tests y resultados, commit/push, tabla de usuarios de prueba con `Admin123!`). Proponer en el vault (`notas/sasha project/`) la `DEC-` de reglas acumulativas / permiso propio `pagos_config:*` / retroactivo explícito.
  - **Verifica:** respuesta del usuario sobre los MAPA y resumen final emitido.

- [ ] **T18 — (OPCIONAL) Opción «Configurar pagos» en `/catalogos/periodos`** (⛔ BLOQUEADA por decisión abierta #3: acceso desde Periodos)
  - **Archivo(s):** `src/routes/_app/catalogos/periodos.tsx`.
  - **Qué:** **solo si se aprueba:** añadir la opción **Configurar pagos** al menú contextual de cada periodo (visible con `<Can permission="pagos_config:get">`), además de la página propia. Si no se aprueba, **no se toca** este archivo.
  - **Verifica:** `pnpm build` compila; la opción aparece solo con el permiso y abre el modal del periodo.

---

## Fase 10: Verificación

- [ ] **V01 — Lint y build del frontend**
  - **Comando:** `pnpm lint` y `pnpm build` (scripts reales de `package.json`).
  - **Verifica:** ambos terminan sin errores.

- [ ] **V02 — E2E del spec nuevo**
  - **Comando:** `pnpm test:e2e src/tests/e2e/configuracion-pagos.spec.ts`
  - **Verifica:** el spec pasa completo (registrar pass/total).

---

## Dependencias

- **Backend `002-configuracion-pagos-periodo` (bloqueante duro).** Esta feature de frontend consume:
  - `GET /pagos/configuracion/{periodo_id}` → `{ periodo_id, dia_pago, dia_mora, grados: [{ grado_id, grado_nombre, monto, reglas_mora: [{ dias, monto }] }] }` (todos los grados; sin config → `monto: 0`, `reglas_mora: []`).
  - `PUT /pagos/configuracion/{periodo_id}` con body `{ dia_pago, dia_mora, retroactivo: bool, grados: [{ grado_id, monto, reglas_mora: [{ dias, monto }] }] }`.
  - Permisos `pagos_config:get` / `pagos_config:put` asignados a `contabilidad` en el backend.
  - Hasta que el backend responda, **T02–T12** no se pueden validar de extremo a extremo (compilan, pero el e2e falla).
- **Datos de catálogo.** La página reutiliza `listPeriodos`/`listGrados` de `src/services/catalogos.ts`; depende de que contabilidad pueda listar periodos (decisión abierta #8).
- **Fixtures.** El e2e depende del usuario `1002026603` y de periodos/grados en `data_test.sql` (ver `Zettels/TEC-DB-04 Mapa del fixture data_test.md`).

## Decisiones abiertas pendientes (del plan §Decisiones abiertas)

| # | Decisión | Tareas bloqueadas / afectadas |
|---|---|---|
| 1 | Nombre exacto de la ruta (`/configuracion-pagos` vs `/pagos/configuracion` vs `/configuracion/pagos`) | **T05, T08** (bloqueadas); T10, T13 |
| 2 | Roles con el permiso (¿solo `contabilidad` o también `admin`/`admin_temporal`?) | **T04** (bloqueada); T11 (caso «sin permiso») |
| 3 | Añadir «Configurar pagos» al menú de `/catalogos/periodos` para admin | **T18** (opcional, bloqueada); T13 |
| 4 | Ubicación del componente/carpeta (`components/pagos/` vs `components/catalogos/`) | **T06, T07** (bloqueadas) |
| 5 | Servicio: archivo nuevo `pagos-config.ts` vs ampliar `pagos.ts` | **T02** (bloqueada) |
| 6 | Textos/labels exactos (títulos, «Día de pago», «N días o más», mensajes y botones del retroactivo) | **T05, T07** (bloqueadas); T11 |
| 7 | Detección de «ya existía config» (por datos del `GET` vs flag/`updated_at` del backend) | **T07** (bloqueada); T11 (casos 7–9) |
| 8 | Acceso de contabilidad a `GET /catalogos/periodos` o endpoint de periodos para `pagos_config:get` | **T08** (bloqueada) |
| 9 | Formato/orden de la lista de reglas (orden por `dias`; ordenar en el `PUT`; respuesta desordenada) | **T03, T07** (bloqueadas); T11 |
| 10 | Icono del nav (`wallet` u otro) y su posición respecto a `Pagos`/`Recibos` | **T05** (bloqueada) |

---

## Resumen por fase

| Fase | Tareas | N.º |
|---|---|---|
| Fase 0: Preparación | T01 | 1 |
| Fase 1: Servicio y tipos | T02 | 1 |
| Fase 2: Helpers puros | T03 | 1 |
| Fase 3: Permisos y navegación | T04–T05 | 2 |
| Fase 4: Componentes | T06–T07 | 2 |
| Fase 5: Página | T08 | 1 |
| Fase 6: Estilos | T09 | 1 |
| Fase 7: Rutas y validación | T10 | 1 |
| Fase 8: E2E Playwright | T11–T12 | 2 |
| Fase 9: Documentación | T13–T18 | 6 |
| Fase 10: Verificación | V01–V02 | 2 |
| **Total** | | **20** |
