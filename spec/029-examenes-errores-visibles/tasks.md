# Tareas — Errores visibles al cargar opciones de exámenes — Frontend

## Estado (2026-11-08)

- **Planificado:** las 10 etapas del `plan.md` (helper de mensajes, banner `ExamenOpcionesAlert`, query + banner + bloqueo de **Agregar** en `/examenes`, propagación al wizard, `emptyLabel` de selectores, **Siguiente** deshabilitado con faltantes, estados vacíos de supervisores/tablero, e2e de 404/403/200 vacío, regresión visual 1366×900 y 390×844, y cierre con lint/build/MAPA).
- **Sin tocar aún:** no se ha creado ni modificado ningún archivo de `src/`; `src/lib/examenesErrores.ts` y `src/components/examenes/ExamenOpcionesAlert.tsx` no existen todavía y `src/routes/_app/examenes.tsx` / `src/components/examenes/ExamenWizard.tsx` siguen en su versión actual (sin `isError`, sin `emptyLabel`, sin `datosFaltantes`).
- **Migración:** **no requiere migración** de base de datos; el alcance es solo `sasha_fronted` (sin backend, contrato, permisos, `DataTable`, `Combobox`, `api.ts` ni estilos globales).

## Etapa 1 — Helper de mensajes del módulo

- [ ] 1.1 Crear `src/lib/examenesErrores.ts` con el tipo `ExamenOpcionesFallo` (`status?`, `titulo`, `detalle`, `requestId?`); verifica: `pnpm tsc --noEmit`.
- [ ] 1.2 Implementar `describirFalloOpciones(err)` con rama `err instanceof ApiError && err.status === 403` → título “Tu rol no puede ver el catálogo de exámenes” y detalle que menciona `examenes:get`; verifica: ejecución manual en consola con `new ApiError(...)` o aserción temporal.
- [ ] 1.3 Rama `status === 404` → título “El módulo de exámenes no está disponible” y detalle que explica que el backend no reconoce `/examenes/opciones`; verifica: misma prueba manual con `ApiError` de 404.
- [ ] 1.4 Rama `status >= 500` → título “El servidor falló al cargar el catálogo” y `requestId` copiado de `ApiError.requestId` solo si existe; verifica: aserción de que `requestId` aparece con `ApiError` de 500 y no aparece sin él.
- [ ] 1.5 Rama `err instanceof TypeError` → título “No se pudo conectar con el servidor”; cualquier otro `Error` → `detalle = userMessageFromError(err)`; verifica: `pnpm tsc --noEmit` y prueba manual de que no se duplica la lógica de 401/403/red de `api.ts`.
- [ ] 1.6 Implementar `describirVacioOpciones({ periodos, parciales, modalidades })` que devuelve `null` si `periodos > 0` y el aviso “No hay periodos académicos configurados” si `periodos === 0`; verifica: prueba manual de ambos casos.
- [ ] 1.7 Confirmar que el helper no modifica `src/lib/api.ts` ni importa `services/examenes.ts` (recibe conteos); verifica: `pnpm lint src/lib/examenesErrores.ts` y revisión de imports.

## Etapa 2 — Componente `ExamenOpcionesAlert`

- [ ] 2.1 Crear `src/components/examenes/ExamenOpcionesAlert.tsx` con props `fallo`, `reintentando`, `onReintentar`, `puedeVerCatalogos`; verifica: `pnpm tsc --noEmit`.
- [ ] 2.2 Contenedor `<div className="empty-state" role="alert" data-testid="examenes-opciones-alerta">`; verifica: render temporal y `data-testid` presente en el DOM.
- [ ] 2.3 Título `<strong>` con `style={{ color: 'var(--sasha-danger)' }}`, detalle en `<p>` y `request_id` en `<span className="texto-muted"><code>…</code></span>`; verifica: inspección del markup renderizado con `fallo.requestId` presente y ausente.
- [ ] 2.4 Botón **Reintentar** con `className="btn btn--primary btn--sm"`, `data-testid="examenes-opciones-reintentar"`, `disabled={reintentando}` y texto “Reintentando…” durante el refetch; verifica: render con `reintentando` en `true` y `false`.
- [ ] 2.5 Enlace **Ir a Periodos** con `<Link to="/catalogos/periodos">` visible solo si `puedeVerCatalogos`; verifica: render con la prop en `true` y en `false`.
- [ ] 2.6 Confirmar que no hay degradados ni CSS nuevo (`styles/*.css` sin cambios) y que el lint del archivo pasa; verifica: `pnpm lint src/components/examenes/ExamenOpcionesAlert.tsx` y búsqueda de `gradient` en el archivo.

## Etapa 3 — Query, banner y bloqueo de **Agregar** en `/examenes`

- [ ] 3.1 Destructurar `{ data: opcionesData, isLoading, isError, error, refetch, isFetching }` de la query de opciones en `src/routes/_app/examenes.tsx:66-70`; verifica: `pnpm tsc --noEmit`.
- [ ] 3.2 Calcular `const fallo = isError ? describirFalloOpciones(error) : null` y `const vacio = !isLoading && !isError ? describirVacioOpciones({...}) : null`; verifica: `pnpm tsc --noEmit`.
- [ ] 3.3 Emitir `toast.error(fallo.titulo)` una sola vez con `useRef<string | null>` y clave `${status}:${requestId ?? titulo}`, limpiando la clave cuando llegan opciones con periodos; verifica: prueba manual con 404 y conteo de toasts ≤ 1.
- [ ] 3.4 Pintar el banner como `beforeTable={<ExamenOpcionesAlert ... />}` en el `DataTable` de `src/routes/_app/examenes.tsx`; verifica: `data-testid="examenes-opciones-alerta"` visible dentro de la tarjeta de registros.
- [ ] 3.5 Ajustar `canAdd={can('examenes:post') && !loadingOpciones && !isError && opciones.periodos.length > 0}` en `src/routes/_app/examenes.tsx:322`; verifica: con 404 el botón `examen-add-button` tiene `toHaveCount(0)` y con 200 con datos vuelve a aparecer.
- [ ] 3.6 Verificar que el vacío 200 muestra banner sin toast y que un fallo nunca deja combos vacíos sin aviso; verifica: `pnpm exec playwright test` (etapa 8) o `page.route` manual con DevTools.
- [ ] 3.7 Confirmar que con error la lista, los filtros, el Excel y las acciones de fila siguen operativas; verifica: prueba manual en `/examenes` con la ruta de opciones en 404.

## Etapa 4 — Propagar el estado al wizard

- [ ] 4.1 Ampliar `ExamenWizardProps` en `src/components/examenes/ExamenWizard.tsx:48-54` con `opcionesFallo?: ExamenOpcionesFallo | null`, `onReintentarOpciones?: () => void` y `reintentando?: boolean`; verifica: `pnpm tsc --noEmit`.
- [ ] 4.2 Pasar desde `src/routes/_app/examenes.tsx:399-408` `opcionesFallo={fallo ?? vacio}`, `onReintentarOpciones={() => void refetch()}` y `reintentando={isFetching}`; verifica: `pnpm tsc --noEmit`.
- [ ] 4.3 Mostrar el aviso compacto al inicio del paso 0 del wizard con `role="alert"`, sin botón duplicado cuando no hay `onReintentarOpciones`; verifica: render con y sin callback.
- [ ] 4.4 Abrir **Editar** de una fila con la ruta de opciones en 404 y confirmar que el wizard avisa y permite reintentar sin cerrar el modal; verifica: prueba manual con `page.route`.

## Etapa 5 — Estados vacíos en los selectores del paso 0

- [ ] 5.1 Pasar `emptyLabel` al `Combobox` de periodo: `'No hay periodos configurados'` si `opciones.periodos.length === 0`, si no `'Sin resultados'`; verifica: `pnpm tsc --noEmit` y prueba con `periodos = []`.
- [ ] 5.2 Pasar `emptyLabel` al `Combobox` de parcial: `'Elige un periodo primero'`, `'Este periodo no tiene parciales'` o `'Sin resultados'` según el caso; verifica: prueba con periodo sin parciales.
- [ ] 5.3 Pasar `emptyLabel` al `Combobox` de modalidad: `'No hay modalidades configuradas'` o `'Sin resultados'`; verifica: prueba con `modalidades = []`.
- [ ] 5.4 Añadir el mensaje bajo el selector de periodo y el enlace condicionado a `/catalogos/periodos` con `useCan` de `#/components/gates/Can` (alternativa: “Pide a secretaría que configure el periodo.”); verifica: render con y sin `catalogos:get`.
- [ ] 5.5 Confirmar que no se cambian los placeholders de búsqueda de los `Combobox`; verifica: `pnpm lint src/components/examenes/ExamenWizard.tsx` y diff de los `placeholder`.

## Etapa 6 — **Siguiente** deshabilitado con datos faltantes

- [ ] 6.1 Calcular `datosFaltantes` en el paso 0 (periodo, parcial, modalidad, fecha de inicio, fecha de fin); verifica: `pnpm tsc --noEmit` y prueba con cada campo vacío.
- [ ] 6.2 Aplicar `disabled={step === 0 && datosFaltantes.length > 0}` al botón **Siguiente** en `src/components/examenes/ExamenWizard.tsx:563-566`; verifica: el botón está deshabilitado al abrir el wizard vacío.
- [ ] 6.3 Renderizar `<p id="examen-wizard-faltantes" aria-live="polite">Falta: …</p>` y enlazarlo con `aria-describedby` del botón; verifica: el texto coincide con los campos vacíos y el atributo apunta al `id`.
- [ ] 6.4 Conservar `validarDatos()` (`ExamenWizard.tsx:240-258`) para los errores semánticos de fechas fuera del parcial con toast; verifica: prueba manual con fechas fuera de rango.
- [ ] 6.5 Comprobar que al completar los campos el botón se habilita y que intentar avanzar vacío ya no lanza toast; verifica: prueba manual del paso 0.

## Etapa 7 — Estados vacíos de supervisores y tablero

- [ ] 7.1 Pasar `emptyLabel` al `Combobox` de maestro en supervisores: `'No hay maestros disponibles'`; verifica: prueba con lista de maestros vacía.
- [ ] 7.2 Pasar `emptyLabel` al `Combobox` de sección en supervisores: `'Esta modalidad no tiene secciones'`; verifica: prueba con modalidad sin secciones.
- [ ] 7.3 Mostrar aviso en el paso 3 cuando `pills.length === 0`: “No hay asignaciones para este periodo y modalidad; revisa el plan de estudio del periodo”; verifica: prueba con `asignaciones = []`.
- [ ] 7.4 Ocultar los filtros de grado/sección vacíos del tablero; verifica: prueba con `asignaciones = []` y con datos.
- [ ] 7.5 Confirmar que `src/components/examenes/ExamenBoard.tsx:90-113` no se modifica y que no hay choques con el tablero; verifica: `git diff --stat` sin cambios en `ExamenBoard.tsx`.
- [ ] 7.6 Revisar que ningún selector del wizard queda mudo en los escenarios vacíos; verifica: `pnpm tsc --noEmit` y `pnpm lint src/components/examenes/ExamenWizard.tsx`.

## Etapa 8 — E2E de 404, 403 y 200 vacío

- [ ] 8.1 Crear `src/tests/e2e/examenes-errores.spec.ts` con `loginAs` (`src/tests/e2e/fixtures/auth.ts:26-51`) y `page.route(/\/api\/examenes\/opciones(\?.*)?$/, ...)` registrado antes de navegar, en serie con `workers: 1`; verifica: `pnpm exec playwright test src/tests/e2e/examenes-errores.spec.ts`.
- [ ] 8.2 Caso 404 (`text/plain` “404 page not found”): banner “El módulo de exámenes no está disponible”, `examen-add-button` con `toHaveCount(0)`, toast ≤ 1, y tras `page.unroute` + **Reintentar** el banner desaparece y el botón vuelve; verifica: aserciones con `timeout: 10_000`.
- [ ] 8.3 Caso 403 (JSON `{ message: 'No tienes permiso' }`): banner “Tu rol no puede ver el catálogo…” y un solo `[data-sonner-toast]` (esperar 1–2 s y volver a contar); verifica: aserción de conteo igual a 1.
- [ ] 8.4 Caso 200 vacío (JSON con los 8 arreglos vacíos): banner “No hay periodos académicos configurados”, enlace con `href="/catalogos/periodos"` y `[data-sonner-toast]` en 0; verifica: aserciones del spec.
- [ ] 8.5 Correr la suite e2e completa del archivo sin depender de backend nuevo; verifica: `pnpm exec playwright test src/tests/e2e/examenes-errores.spec.ts` en verde con `workers: 1`.

## Etapa 9 — Regresión visual y responsive

- [ ] 9.1 Repetir el caso 404 en viewport 1366×900 y confirmar banner legible y sin desbordes; verifica: aserción `document.documentElement.scrollWidth <= innerWidth` en el spec.
- [ ] 9.2 Repetir el caso 404 en viewport 390×844 y confirmar que no hay scroll horizontal; verifica: misma aserción de `scrollWidth` en móvil.
- [ ] 9.3 Confirmar que **Reintentar** es visible y clickeable en móvil y que la tabla pasa a cards como hoy; verifica: aserción de visibilidad/click en el spec.
- [ ] 9.4 Adjuntar captura manual de ambos tamaños en la sesión y comprobar ausencia de degradados y uso de tokens; verifica: revisión visual + `pnpm exec playwright test src/tests/e2e/examenes-errores.spec.ts`.

## Etapa 10 — Cierre: lint, build y MAPA

- [ ] 10.1 Ejecutar `pnpm tsc --noEmit` sin errores; verifica: salida en verde.
- [ ] 10.2 Ejecutar `pnpm lint src/lib/examenesErrores.ts src/components/examenes/ExamenOpcionesAlert.tsx src/components/examenes/ExamenWizard.tsx src/routes/_app/examenes.tsx src/tests/e2e/examenes-errores.spec.ts` sin errores nuevos.
- [ ] 10.3 Ejecutar `pnpm build` correctamente; verifica: build completo sin fallos.
- [ ] 10.4 Ejecutar `pnpm exec playwright test src/tests/e2e/examenes-errores.spec.ts` en verde.
- [ ] 10.5 Preguntar explícitamente si se actualiza `documentacion/MAPA.md:94-98` y `:116` con la nueva conducta de errores.
- [ ] 10.6 Actualizar `documentacion/MAPA.md` solo tras aprobación (sin editarlo en silencio) y dejar registrado que **no requiere migración**.

## Criterios de aceptación

- [ ] Un 403, 404, 500 o fallo de red en `/examenes/opciones` produce un banner con `role="alert"`, mensaje específico y botón **Reintentar**; nunca un combo vacío silencioso.
- [ ] El 500 muestra `request_id` cuando el backend lo envía; el 404 distingue “módulo no desplegado”; el 403 menciona `examenes:get`; el fallo de red menciona la conexión.
- [ ] Un 200 con `periodos: []` muestra banner de catálogo vacío con enlace a `/catalogos/periodos` (si hay permiso) y **Reintentar**, sin toast de error.
- [ ] **Agregar horario** no está disponible con error o sin periodos, y vuelve al reintentar con éxito; la lista, filtros, Excel y acciones de fila siguen operativas.
- [ ] Sale como máximo **un toast por fallo** y la alerta inline permanece visible.
- [ ] En el wizard, cada selector explica su vacío con `emptyLabel` propio; el de periodos ofrece `/catalogos/periodos` cuando corresponde.
- [ ] **Siguiente** está deshabilitado si falta periodo, parcial, modalidad o fechas, y se indica exactamente qué falta; los errores de rango de fechas siguen avisando.
- [ ] `pnpm tsc --noEmit`, `pnpm lint` de los archivos tocados, `pnpm build` y `pnpm exec playwright test src/tests/e2e/examenes-errores.spec.ts` pasan.
- [ ] Desktop y 390 px: sin scroll horizontal, banner legible, botón usable; sin degradados, solo tokens; el buscador de la tabla sigue siendo «Buscar…».
- [ ] No se modifican backend, contrato, permisos, `DataTable`, `Combobox`, `api.ts` ni estilos globales; no hay migración de base de datos.
