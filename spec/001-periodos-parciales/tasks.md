# Checklist de Tareas: Periodos con parciales anidados y configuración por periodo — Frontend

> Desglose atómico derivado de [`plan.md`](./plan.md). Feature **001-periodos-parciales** · capa **frontend** (`sasha_fronted/`).
> Todos los comandos se ejecutan en `sasha_fronted/`.
>
> **Convenciones del checklist**
> - Estado inicial: todas las casillas sin marcar (`- [ ]`).
> - Cada tarea indica **Archivo(s)**, **Qué** y **Verifica**.
> - Orden por dependencia: helpers → servicios/tipos → componente → páginas → limpieza → estilos → rutas/validación → e2e → documentación → verificación.
> - Reglas Sasha: **sin degradados** (REG-UI-01); placeholder de buscador siempre «Buscar…» (REG-UI-11); listado con estilo registros (REG-UI-12); formulario en `Modal` con `useDismiss` + `ConfirmDialog` (REG-UI-04).
> - No se crean rutas nuevas; `pnpm generate-routes` se corre igual para dejar el `routeTree.gen.ts` consistente.

---

## Fase 0: Preparación

- [x] **T01 — Congelar puntos de anclaje y contratos de tipos**
  - **Archivo(s):** `src/routes/_app/catalogos/periodos.tsx`, `src/components/catalogos/ParcialesPeriodoModal.tsx`, `src/components/disciplina/TipoFichaModal.tsx`, `src/services/catalogos.ts`, `src/services/configuracion.ts` (lectura).
  - **Qué:** releer el plan §3–§9 y confirmar las firmas reales que se van a tocar: patrón de filas repetibles de `TipoFichaModal` (`nivelSeq`, `.niveles`, `.nivel-fila`, `+ Agregar`, `Trash2`), `fieldset.periodo-reglas`, `confirmSave`, `dirty`, tipos actuales de `Periodo`/`PeriodoCreate`/`Parcial`/`Grado`/`Modalidad`. No escribir código aún.
  - **Verifica:** nota de reconocimiento con los nombres reales de helpers, estados y `data-testid`; sin comandos (tarea de lectura).

## Fase 1: Helpers puros

- [x] **T02 — Crear `src/helpers/parciales.ts`**
  - **Archivo(s):** `src/helpers/parciales.ts` (nuevo).
  - **Qué:** implementar funciones puras: `parcialNombre(numero)` → romano clásico + `" parcial"` (`1 → "I parcial"`, `4 → "IV parcial"`); `derivarFechasPeriodo(parciales)` → `{ fecha_inicio, fecha_fin }` (mínima `fecha_inicio` y máxima `fecha_fin`; `"—"`/vacío si no hay fechas válidas); `mesesDelRango(inicio, fin)` movido desde `ParcialesPeriodoModal` **si algún consumidor aún lo usa** (hoy solo el propio modal; si no, no se migra). No editar otras rutas de helpers.
  - **Verifica:** `pnpm lint` sin errores; revisión de que `parcialNombre(1)==='I parcial'` y `derivarFechasPeriodo` con/sin fechas devuelve lo esperado.

## Fase 2: Servicios y tipos

- [x] **T03 — Actualizar `src/services/catalogos.ts`**
  - **Archivo(s):** `src/services/catalogos.ts`.
  - **Qué:** redefinir `Parcial` (`id?`, `numero`, `nombre`, `fecha_inicio`, `fecha_fin`, `nota_maxima`, `status?`), `ParcialInput` (`Omit<Parcial,'id'|'nombre'|'status'> & { id? }`); `Periodo` gana `fecha_inicio`/`fecha_fin` (derivadas, solo lectura), `umbral_honor`, `umbral_excelencia` y `parciales: Parcial[]`; `PeriodoCreate` gana `nota_minima?` (= “Mínima aprobación”), `umbral_honor?`, `umbral_excelencia?` y `parciales: ParcialInput[]` (obligatorio, ≥1), **sin** `fecha_inicio`/`fecha_fin`; `Grado`/`GradoCreate` ganan `modalidad_sace?: string`; `Modalidad`/`ModalidadCreate` pierden `cantidad_parciales_por_periodo` y `duracion_parcial_dias`; **retirar** `ParcialInput` viejo (con `periodo_academico_id`/`nombre`), `listParciales`, `createParcial` y `updateParcial`.
  - **Verifica:** `pnpm build` compila; grep de `listParciales`/`createParcial`/`updateParcial` sin consumidores restantes.

- [x] **T04 — Actualizar `src/services/configuracion.ts`**
  - **Archivo(s):** `src/services/configuracion.ts`.
  - **Qué:** quitar de `Configuracion` y `ConfiguracionUpdate` los campos `calificacion_minima_aprobacion`, `calificacion_honor_merito`, `calificacion_excelencia`, `calificacion_rango_bajo` y `modalidad_sace`. Conservar `nombre_institucion`, `codigo_sace`, `logo_app_key`, `logo_institucion_key`.
  - **Verifica:** `pnpm build` compila; ninguna referencia a los campos retirados fuera de código a limpiar en Fase 4.

## Fase 3: Componente de parciales

- [x] **T05 — Crear `src/components/catalogos/ParcialesPeriodoForm.tsx` (estructura y filas)**
  - **Archivo(s):** `src/components/catalogos/ParcialesPeriodoForm.tsx` (nuevo).
  - **Qué:** componente reutilizable con props `value: ParcialForm[]`, `onChange`, `disabled` (para `viewOnly`) y `periodoStatus` (bloquear si `FINALIZED`). Clonar el patrón de `TipoFichaModal`: sección con `.expediente__seccion`/`.expediente__titulo`, lista `.niveles` de filas `.nivel-fila`, `key` temporal (patrón `nivelSeq`), botón **+ Agregar** (`Plus`, `data-testid="periodo-parcial-agregar"`) y quitar por fila (`Trash2`, `.nivel-fila__quitar`), deshabilitando quitar cuando quede una sola fila. Contenedor `data-testid="periodo-parciales"`.
  - **Verifica:** `pnpm build` compila; el componente renderiza ≥1 fila al montarse y agrega/quita filas sin salir del formulario.

- [x] **T06 — Nombres autogenerados, `nota_maxima`, fechas y validación en el componente**
  - **Archivo(s):** `src/components/catalogos/ParcialesPeriodoForm.tsx`.
  - **Qué:** mostrar el **nombre autogenerado** con `parcialNombre(numero)` como texto/`badge` (sin input editable) y recalcular el `numero` por posición al agregar/quitar; input `Fecha inicio` (`type=date`), `Fecha fin` (`type=date`, `min` = inicio de la fila) y `Nota máxima` (`type=number`, `min=0`, `max=100`, default `100`). Validación de fila (`fecha_fin >= fecha_inicio`, `nota_maxima` 0–100, vacío = 100) con mensaje de error visible y bloqueo de guardado. Añadir `data-testid`: `periodo-parcial-{i}`, `periodo-parcial-{i}-nombre`, `periodo-parcial-{i}-inicio`, `periodo-parcial-{i}-fin`, `periodo-parcial-{i}-nota-maxima`, `periodo-parcial-{i}-quitar`.
  - **Verifica:** `pnpm build` compila; fila 4 muestra “IV parcial”; una `fecha_fin` anterior a `fecha_inicio` marca la fila y bloquea Guardar.

## Fase 4: Páginas

- [x] **T07 — Integrar parciales y fechas derivadas en `periodos.tsx`**
  - **Archivo(s):** `src/routes/_app/catalogos/periodos.tsx`.
  - **Qué:** montar `ParcialesPeriodoForm` dentro del modal de alta/edición, sembrar `form.parciales` en `openEdit` y en default; **quitar** los inputs editables “Fecha inicio”/“Fecha fin” y mostrarlos **derivados solo lectura** (`data-testid="periodo-fechas-derivadas"`) con `derivarFechasPeriodo`, mostrando “—” sin fechas válidas; enviar `parciales` en `createPeriodo`/`updatePeriodo`; mantener el guardado único con `ConfirmDialog` (`confirmSave`) y `dirty`; retirar el estado `parcialesDe` y el render de `ParcialesPeriodoModal`.
  - **Verifica:** `pnpm build` compila; abrir “Agregar periodo” muestra la sección de parciales y las fechas derivadas siguen al primer/último parcial.

- [x] **T08 — Umbrales por periodo en `periodos.tsx`**
  - **Archivo(s):** `src/routes/_app/catalogos/periodos.tsx`.
  - **Qué:** dentro del `fieldset.periodo-reglas` (`data-testid="periodo-reglas"`, title “Promoción y recuperaciones”) añadir “Mínima aprobación” (= `nota_minima`, sin duplicar), “Honor al mérito” (`data-testid="periodo-umbral-honor"`) y “Excelencia” (`data-testid="periodo-umbral-excelencia"`); incluirlos en el payload de `PeriodoCreate`. Mantener `periodo-nota-minima`.
  - **Verifica:** `pnpm build` compila; el formulario muestra los tres umbrales y los envía al guardar.

- [x] **T09 — Quitar la opción “Parciales” del menú contextual en `periodos.tsx`**
  - **Archivo(s):** `src/routes/_app/catalogos/periodos.tsx`.
  - **Qué:** eliminar la opción `data-testid="periodo-ctx-parciales"` y su handler; conservar Ver / Editar / Eliminar como hoy.
  - **Verifica:** `pnpm build` compila; el clic derecho sobre una fila ya no muestra “Parciales”.

- [x] **T10 — “Programa académico SACE” en `grados.tsx`**
  - **Archivo(s):** `src/routes/_app/catalogos/grados.tsx`.
  - **Qué:** añadir `Field` “Programa académico SACE” (`modalidad_sace`, placeholder “Ej. BACHILLERATO TÉCNICO PROFESIONAL EN INFORMÁTICA”, `data-testid="grado-modalidad-sace"`); incluirlo en `defaultForm: GradoCreate` y en `openEdit`; mostrarlo opcional en el resumen del listado. Conservar `grado-save-button` y `grado-nombre-input`.
  - **Verifica:** `pnpm build` compila; editar un grado persiste `modalidad_sace` al reabrir.

- [x] **T11 — Quitar el paso “Parciales” del wizard en `modalidades.tsx`**
  - **Archivo(s):** `src/routes/_app/catalogos/modalidades.tsx`.
  - **Qué:** eliminar el paso “Parciales” (índice 4), sus validaciones e inputs (`cantidad_parciales_por_periodo`, `duracion_parcial_dias`) y las filas correspondientes del resumen; ajustar `STEPS` y el índice de los pasos posteriores.
  - **Verifica:** `pnpm build` compila; el wizard de modalidad ya no muestra el paso de parciales ni esos campos.

- [x] **T12 — Limpiar `configuracion.tsx`**
  - **Archivo(s):** `src/routes/_app/configuracion.tsx`.
  - **Qué:** quitar del `emptyForm`/`configToForm` los cuatro umbrales y `modalidad_sace`; eliminar la sección “Umbrales de calificación” y el campo “Programa académico SACE”; ajustar el texto introductorio (umbrales ahora por periodo; programa SACE en el grado). Conservar “Nombre de la institución” y “Código SACE institucional” (`config-*`).
  - **Verifica:** `pnpm build` compila; `/configuracion` no muestra umbrales ni “Programa académico SACE”.

## Fase 5: Limpieza

- [x] **T13 — Eliminar `src/components/catalogos/ParcialesPeriodoModal.tsx`**
  - **Archivo(s):** `src/components/catalogos/ParcialesPeriodoModal.tsx` (eliminar).
  - **Qué:** confirmar que ningún módulo lo importa (incluido `periodos.tsx` tras T07); migrar `mesesDelRango` a `src/helpers/parciales.ts` antes de borrar si algún consumidor lo usa; borrar el archivo.
  - **Verifica:** `pnpm build` compila; grep de `ParcialesPeriodoModal` sin referencias.

## Fase 6: Estilos

- [x] **T13b — Ajustar BEM de parciales en `src/styles/style1.css`**
  - **Archivo(s):** `src/styles/style1.css`.
  - **Qué:** reutilizar `.ficha-form`, `.expediente__seccion`, `.expediente__titulo`, `.niveles`, `.nivel-fila`, `.nivel-fila__quitar`, `.niveles__pie`; añadir ajustes mínimos (p. ej. `.parcial-fila__fechanombre`, ancho de los `type=date`) si el layout difiere del de niveles. **Sin degradados** (usar tokens sólidos). Verificar que el buscador del listado sigue siendo «Buscar…».
  - **Verifica:** `pnpm build` compila; la sección de parciales se ve igual que “Nuevo tipo de ficha” en dark y light.

## Fase 7: Rutas y validación del frontend

- [x] **T14 — Regenerar rutas y validar el frontend**
  - **Archivo(s):** `src/routeTree.gen.ts` (generado); `—` (verificación).
  - **Qué:** ejecutar `pnpm generate-routes` (no hay rutas nuevas, pero se regenera para dejar el árbol consistente; no editar a mano); luego `pnpm lint` y `pnpm build`.
  - **Verifica:** `pnpm generate-routes` sin error; `pnpm lint` y `pnpm build` sin errores.

## Fase 8: E2E Playwright

- [x] **T15 — Crear `src/tests/e2e/periodos.spec.ts`**
  - **Archivo(s):** `src/tests/e2e/periodos.spec.ts` (nuevo), usando `loginAs` de `src/tests/e2e/fixtures/auth.ts`.
  - **Qué:** `test.describe('periodos @critical')` con datos únicos (`Date.now()`), esperando `data-table-add-button` con `timeout: 15_000` (patrón `catalogos.spec.ts`). Cubrir: (1) crear periodo con 3 parciales verificando `periodo-parcial-1/2/3-nombre` = “I/II/III parcial”; (2) `nota-maxima` e `inicio`/`fin` por fila; (3) `periodo-fechas-derivadas` de solo lectura; (4) Guardar + `ConfirmDialog` + aparición en tabla; (5) editar (cambiar `nota_maxima`, quitar fila) y persistencia; (6) `/configuracion` sin umbrales ni “Programa académico SACE”, con “Código SACE institucional”; (7) `/catalogos/grados` con `grado-modalidad-sace` persistido; (8) menú contextual de periodo sin “Parciales”.
  - **Verifica:** `pnpm test:e2e src/tests/e2e/periodos.spec.ts` → PASS.

- [x] **T16 — Correr los e2e de periodos**
  - **Archivo(s):** `—` (verificación).
  - **Qué:** levantar el backend de pruebas (`go run ./cmd/resetdb` + backend contra `molde_test`, según `MAPA.md`) y ejecutar `pnpm test:e2e src/tests/e2e/periodos.spec.ts`.
  - **Verifica:** el spec pasa completo; registrar y corregir cualquier fallo antes de cerrar.

## Fase 9: Documentación

- [x] **T17 — Actualizar `documentacion/MAPA.md`**
  - **Archivo(s):** `documentacion/MAPA.md`.
  - **Qué:** actualizar las filas de `/configuracion` (sin umbrales ni Programa SACE), `/catalogos/modalidades` (sin paso Parciales), `/catalogos/periodos` (parciales y umbrales dentro del formulario; sin modal de parciales ni opción “Parciales”) y `/catalogos/grados` (Programa académico SACE); ajustar la mención de modales. **Preguntar** antes de editar (regla MAPA).
  - **Verifica:** cada ruta queda descrita sin los campos retirados; confirmación del usuario registrada.

- [x] **T18 — Actualizar `documentacion/API_CLIENTES.md`**
  - **Archivo(s):** `documentacion/API_CLIENTES.md`.
  - **Qué:** actualizar `Periodos` (parciales anidados, fechas derivadas, umbrales en el periodo), `Grados` (`modalidad_sace`), `Modalidades` (quitar `cantidad_parciales_por_periodo`/`duracion_parcial_dias`) y `Configuración` (quitar umbrales y `modalidad_sace`; queda `codigo_sace`).
  - **Verifica:** los cuatro dominios documentados reflejan el contrato nuevo.

- [x] **T19 — Actualizar `documentacion/prd.md`**
  - **Archivo(s):** `documentacion/prd.md`.
  - **Qué:** el punto 10 (Configuración) reubica umbrales al periodo y `modalidad_sace` al grado; actualizar la tabla del glosario (`modalidad` ya no vive en `configuracion_institucion.modalidad_sace`).
  - **Verifica:** PRD sin referencias obsoletas a umbrales globales ni al SACE en configuración.

- [x] **T20 — Actualizar `documentacion/EVOLUCION.md`**
  - **Archivo(s):** `documentacion/EVOLUCION.md`.
  - **Qué:** registrar que “Programa SACE” pasa de Configuración a Grado y que la duración/parciales de la modalidad se sustituyen por los parciales del periodo.
  - **Verifica:** entrada de evolución redactada y fechada.

- [x] **T21 — Cierre y regla MAPA**
  - **Archivo(s):** `—` (coordinación).
  - **Qué:** confirmar con el usuario que los MAPA quedan actualizados solo con aprobación y si van en el commit; preparar el bloque **Resumen** final (qué se hizo, capas tocadas, tests y resultados, commit/push, tabla de usuarios de prueba con `Admin123!`).
  - **Verifica:** respuesta del usuario sobre los MAPA y resumen final emitido.

---

## Fase 10: Verificación

- [x] **V01 — Regenerar rutas**
  - **Comando:** `pnpm generate-routes`
  - **Verifica:** termina sin error; `src/routeTree.gen.ts` consistente (sin rutas nuevas).

- [x] **V02 — Lint y build del frontend**
  - **Comando:** `pnpm lint` y `pnpm build` (script real de `package.json`).
  - **Verifica:** ambos terminan sin errores.

- [x] **V03 — E2E del spec nuevo**
  - **Comando:** `pnpm test:e2e src/tests/e2e/periodos.spec.ts`
  - **Verifica:** el spec pasa completo (registrar pass/total).

---

## Resumen por fase

| Fase | Tareas | N.º |
|---|---|---|
| Fase 0: Preparación | T01 | 1 |
| Fase 1: Helpers puros | T02 | 1 |
| Fase 2: Servicios y tipos | T03–T04 | 2 |
| Fase 3: Componente de parciales | T05–T06 | 2 |
| Fase 4: Páginas | T07–T12 | 6 |
| Fase 5: Limpieza | T13 | 1 |
| Fase 6: Estilos | T13b | 1 |
| Fase 7: Rutas y validación | T14 | 1 |
| Fase 8: E2E Playwright | T15–T16 | 2 |
| Fase 9: Documentación | T17–T21 | 5 |
| Fase 10: Verificación | V01–V03 | 3 |
| **Total** | | **25** |
