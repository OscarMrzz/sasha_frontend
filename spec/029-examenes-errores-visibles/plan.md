# Plan — Errores visibles al cargar opciones de exámenes — Frontend

- **ID:** 029-examenes-errores-visibles
- **Capa:** frontend (`sasha_fronted`)
- **Contrato:** `backend_sasha/spec/021-examenes-salud-y-diagnostico`
- **Feature relacionada:** `028-horario-examenes`
- **Estado:** planificado
- **Fecha:** 2026-11-08

## 1. Problema y evidencia

Un cliente no ve los periodos al crear un horario de exámenes. El backend desplegado devolvía
**404** porque el dominio `/examenes` no estaba desplegado en esa versión, y el frontend lo
ocultó: la pantalla quedó con combos vacíos y sin ningún aviso.

Confirmado en vivo el **2026-11-08** en `https://sashafrontend-production.up.railway.app`
(admin `1002026100`): `/api/catalogos/periodos` → **200** con «Periodo Test Horarios 2026»
(`ACTIVE`), `/api/examenes/opciones` → **404 `text/plain`** «404 page not found». La pantalla
muestra «0 filas», «Sin resultados» y **Agregar horario** habilitado; el wizard abre con el
selector de periodo vacío. La causa del 404 es un build de Docker roto (spec backend 021,
Etapa 0.5), no la base de datos.

Evidencia en código (verificada el 2026-11-08):

- `src/routes/_app/examenes.tsx:66-70` — `useQuery(['examenes','opciones'])` solo destructura
  `data` e `isLoading`; no usa `isError` ni `error`.
- `src/routes/_app/examenes.tsx:70` — `const opciones = opcionesData ?? EMPTY_OPCIONES`:
  un fallo se convierte en catálogo vacío, indistinguible de “no hay datos”.
- `src/routes/_app/examenes.tsx:32-41` — `EMPTY_OPCIONES` con los 8 arreglos vacíos.
- `src/routes/_app/examenes.tsx:322` — `canAdd={can('examenes:post') && !loadingOpciones}`:
  el botón **Agregar horario** sigue habilitado aunque las opciones hayan fallado.
- `src/routes/_app/examenes.tsx:399-408` — el wizard recibe `opciones` (que puede ser
  `EMPTY_OPCIONES`) y ningún estado de error.
- `src/lib/api.ts:19-44` — `ApiError` sí trae `status`, `code`, `body` y `requestId`.
- `src/lib/api.ts:175-186` — el error se lanza con `ApiError`; en un 404 `text/plain` el
  `message` cae a `mensajePorEstado(404)` (“No se encontró lo que buscas.”), genérico.
- `src/lib/api.ts:208-219` — `logApiFailure` solo escribe en consola; no hay UI.
- `src/lib/api.ts:228-237` — `mensajePorEstado` **no está exportada**, no se puede reutilizar
  tal cual desde el módulo.
- `src/lib/api.ts:239-248` — `userMessageFromError` sí es pública y sirve de respaldo
  (401/403/red), pero no distingue 404 “backend sin el módulo” de 404 “no existe el recurso”.
- `src/components/examenes/ExamenWizard.tsx:145-156` — autoselección del periodo `ACTIVE`;
  si `opciones.periodos` viene vacío, `periodoId` queda `''` y nadie lo explica.
- `src/components/examenes/ExamenWizard.tsx:604-641` — los combos de periodo, parcial y
  modalidad no pasan `emptyLabel`; usan el texto por defecto “Sin resultados”
  (`src/components/ui/Combobox.tsx:47`), que parece “el usuario buscó mal”.
- `src/components/examenes/ExamenWizard.tsx:240-258` y `:289-301` — la validación de datos
  solo ocurre al pulsar **Siguiente** y avisa con un toast; no hay indicación previa de qué
  falta ni botón deshabilitado.
- `src/components/ui/DataTable.tsx:341-345` — `canAdd` **no deshabilita**: no renderiza el
  botón. Es el mecanismo existente, no se modifica en este plan.
- `src/components/providers/AppProviders.tsx:14-19` — `retry` reintenta una vez salvo 401/403;
  un 404/500 tarda dos intentos antes de caer en `isError`.

Patrones ya existentes que se toman como referencia (no se inventan componentes nuevos de UI
global):

- `src/routes/_app/usuarios.tsx:214-226` — `<div className="empty-state" role="alert">` +
  `userMessageFromError(error)` + botón **Reintentar** con `refetch`.
- `src/routes/_app/reportes-examen.tsx:75-78` — `empty-state` + `role="alert"` en una query.
- `src/routes/_app/monitores.tsx:341-344` — `empty-state` + `role="alert"` para `isError`.
- `src/routes/_app/actualizaciones.tsx:121-126` — `empty-state` + `data-testid` + **Reintentar**.
- Estilos: `.empty-state` en `src/styles/style1.css:3083` y `src/styles/style2.css:374`;
  tokens en `src/styles/tokens.css:33-36` (oscuro) y `:80-83` (claro).

## 2. Objetivo

Que cualquier fallo o vacío de `GET /examenes/opciones` sea **visible, específico y
accionable** en `/examenes`: banner persistente con `role="alert"`, mensaje por status,
botón **Reintentar**, bloqueo de **Agregar horario**, un solo toast por fallo, y estados
vacíos accionables en el wizard. Nunca más un combo vacío silencioso.

## 3. Alcance / fuera de alcance

**Alcance (solo `sasha_fronted`):**

1. Query de opciones con `isError`/`error`/`refetch` y un aviso derivado del error.
2. Banner/alerta en `/examenes` (desktop y 390 px) con mensaje por status y **Reintentar**.
3. `canAdd` bloqueado si falló el catálogo o si no hay periodos.
4. Helper de mensajes del módulo que reutiliza `ApiError` y `userMessageFromError`.
5. Wizard: `emptyLabel` por selector, aviso en cabecera, enlace a `/catalogos/periodos`
   para periodos, **Siguiente** deshabilitado con la lista de datos faltantes.
6. Un único toast por fallo + alerta inline persistente.
7. E2E con `page.route` para 404, 403 y 200 vacío; revisión de regresión visual.

**Fuera de alcance:** tocar `backend_sasha`, cambiar la matriz de permisos, cambiar el
contrato de `/examenes/opciones`, rediseñar la página, modificar `DataTable`/`Combobox`,
crear estilos globales nuevos o migraciones de base de datos.

## 4. Comportamiento esperado por status

| Caso | Detección | Título del banner | Detalle | Acción |
|---|---|---|---|---|
| **403** | `ApiError.status === 403` | “Tu rol no puede ver el catálogo de exámenes” | “El rol activo no tiene el permiso `examenes:get`. Cambia de rol desde el menú de usuario o pide acceso a secretaría.” | **Reintentar** (por si cambió el rol) |
| **404** | `ApiError.status === 404` | “El módulo de exámenes no está disponible” | “El backend no reconoce `/examenes/opciones` (404). Normalmente significa que la versión desplegada no incluye el módulo de exámenes.” | **Reintentar** cuando se despliegue |
| **500** | `ApiError.status >= 500` | “El servidor falló al cargar el catálogo” | “Una de las consultas del catálogo falló (la carga es todo-o-nada).” + `request_id: <id>` si vino | **Reintentar** |
| **Red** | `TypeError` (sin respuesta) | “No se pudo conectar con el servidor” | “Revisa tu conexión o que el backend esté encendido.” | **Reintentar** |
| **200 vacío** | `!isError && !isLoading && periodos.length === 0` | “No hay periodos académicos configurados” | “El catálogo llegó vacío. Sin periodo no se puede crear un horario de exámenes.” | **Ir a Periodos** (`/catalogos/periodos`) si `can('catalogos:get')` + **Reintentar** |
| 200 con periodos, sin parciales | `parciales.length === 0` | — (aviso dentro del wizard) | “El periodo seleccionado no tiene parciales.” | Enlace a `/catalogos/periodos` |
| 401 | `ApiError.status === 401` | Sin banner | Ya lo maneja `handleUnauthorized` (`src/lib/api.ts:69-81`): limpia sesión y va a `/login`. | — |

Reglas transversales:

- El banner es **persistente** mientras dure el fallo o el vacío; no desaparece solo.
- **Un solo toast por fallo** (no por render). El vacío 200 **no** genera toast: solo inline.
- Si el fallo es 403, el `QueryClient` no reintenta (`AppProviders.tsx:15-19`), así que el
  banner aparece de inmediato; 404/500 se ven tras el reintento automático (2 intentos).
- El request_id se muestra como texto seleccionable, sin botón de copiar (evita permisos de
  portapapeles en contextos no seguros).

## 5. Decisiones técnicas y componentes

### 5.1 Helper del módulo (nuevo, sin tocar `api.ts`)

`src/lib/examenesErrores.ts`:

```ts
export type ExamenOpcionesFallo = {
  status?: number
  titulo: string
  detalle: string
  requestId?: string
}

export function describirFalloOpciones(err: unknown): ExamenOpcionesFallo
export function describirVacioOpciones(conteos: {
  periodos: number
  parciales: number
  modalidades: number
}): ExamenOpcionesFallo | null
```

- `describirFalloOpciones` hace `err instanceof ApiError` y ramifica por `status`; para
  `TypeError` devuelve el caso de red; para cualquier otro `Error` delega en
  `userMessageFromError(err)` como `detalle` (sin duplicar la lógica de 401/403/red).
- No se reutiliza `mensajePorEstado` porque no está exportada (`api.ts:228`); no se modifica
  `api.ts` para no ampliar el alcance.
- Evita importar tipos de `services/examenes.ts`: recibe conteos, no el objeto
  `ExamenOpciones`, para que `lib/` no dependa de `services/`.
- `describirVacioOpciones` devuelve aviso solo si `periodos === 0`; si hay periodos pero
  faltan parciales/modalidades, el wizard lo explica en su selector.

### 5.2 Banner: componente nuevo de módulo, estilos existentes

`src/components/examenes/ExamenOpcionesAlert.tsx` (nuevo, específico de exámenes; **no** se
crea un componente global en `src/components/ui/`). Se descarta reutilizar `.aviso-banner`
(`src/styles/style1.css:3508+`) porque su markup es del módulo de avisos (icono, fondo,
fecha) y arrastraría semántica ajena.

- Contenedor: `<div className="empty-state" role="alert" data-testid="examenes-opciones-alerta">`.
- Título `<strong>` con `style={{ color: 'var(--sasha-danger)' }}` (token, color sólido).
- `detalle` en `<p>`; `request_id` en `<span className="texto-muted">` con `<code>`.
- Botón **Reintentar**: `className="btn btn--primary btn--sm"`, `data-testid="examenes-opciones-reintentar"`,
  `disabled` mientras `reintentando`, texto “Reintentando…” durante el refetch.
- Enlace **Ir a Periodos**: `<Link to="/catalogos/periodos">` (ruta real en
  `src/routes/_app/catalogos/periodos.tsx:30`), solo si `puedeVerCatalogos`; el padre lo
  calcula con `useCan()` y `can('catalogos:get')`.
- Sin degradados, sin CSS nuevo, sin cambios en `styles.css`.

### 5.3 Ruta `/examenes`

- Destructurar `{ data: opcionesData, isLoading, isError, error, refetch, isFetching }` de la
  query de opciones (`examenes.tsx:66-70`).
- `const fallo = isError ? describirFalloOpciones(error) : null`.
- `const vacio = !isLoading && !isError ? describirVacioOpciones({...}) : null`.
- Un `useRef<string | null>` con la clave `${status}:${requestId ?? titulo}` para emitir
  `toast.error(fallo.titulo)` una sola vez por fallo; se limpia cuando llegan opciones con
  periodos. El vacío no emite toast.
- `beforeTable={<ExamenOpcionesAlert ... />}` (prop existente en `DataTable.tsx:66-67`,
  renderizada en `:349`), así el aviso queda dentro de la tarjeta de registros.
- `canAdd={can('examenes:post') && !loadingOpciones && !isError && opciones.periodos.length > 0}`
  (hoy `:322`). `DataTable` oculta el botón cuando es `false` (`:341-345`); el banner explica
  que volverá al reintentar con éxito. No se modifica `DataTable`.
- Pasar al wizard: `opcionesFallo={fallo ?? vacio}`, `onReintentarOpciones={() => void refetch()}`,
  `reintentando={isFetching}`.

### 5.4 Wizard

- Props nuevas en `ExamenWizardProps` (`ExamenWizard.tsx:48-54`): `opcionesFallo?: ExamenOpcionesFallo | null`,
  `onReintentarOpciones?: () => void`, `reintentando?: boolean`. El aviso se pinta al inicio
  del paso 0 con el mismo componente compacto (sin botón duplicado si no hay callback).
- `emptyLabel` en cada `Combobox` (`Combobox.tsx:24-38` ya lo soporta):
  - Periodo: `opciones.periodos.length === 0 ? 'No hay periodos configurados' : 'Sin resultados'`.
  - Parcial: `!periodoId ? 'Elige un periodo primero' : parcialesDelPeriodo.length === 0 ? 'Este periodo no tiene parciales' : 'Sin resultados'`.
  - Modalidad: `opciones.modalidades.length === 0 ? 'No hay modalidades configuradas' : 'Sin resultados'`.
  - Maestro y sección de supervisores (`:769-790`): “No hay maestros disponibles” /
    “Esta modalidad no tiene secciones”.
- **Grados y cursos no son selectores del wizard**: se derivan de `opciones.asignaciones`
  (`ExamenWizard.tsx:204-231`) y se filtran en el tablero (`ExamenBoard.tsx:90-113`). Su
  estado vacío se cubre en el paso 3 (ver etapa 7), no con un combo inexistente.
- **Siguiente** deshabilitado en el paso 0 si falta algo, con la lista visible:
  `datosFaltantes` (periodo, parcial, modalidad, fecha de inicio, fecha de fin) y
  `<p id="examen-wizard-faltantes" aria-live="polite">Falta: periodo académico y parcial.</p>`.
  El botón (`:563-566`) lleva `disabled={step === 0 && datosFaltantes.length > 0}` y
  `aria-describedby` apuntando al párrafo. `validarDatos()` (`:240-258`) se conserva para los
  errores semánticos (fechas fuera del parcial), que siguen avisando con toast.
- Enlace a `/catalogos/periodos` bajo el selector de periodo cuando no hay periodos, solo si
  el usuario tiene `catalogos:get`; si no, texto “Pide a secretaría que configure el periodo.”
  Se usa `useCan` de `#/components/gates/Can` (ya usado en la ruta).

### 5.5 Accesibilidad y estilo

- `role="alert"` en el banner de la página y en el aviso del wizard; `aria-live` para la
  lista de faltantes.
- Botones con texto visible (`Reintentar`, `Ir a Periodos`); foco visible del tema.
- Estilo registros (REG-UI-12) intacto: `DataTable`, buscador «Buscar…», Excel y conteo.
  No se tocan los placeholders de los `Combobox` (“Buscar periodo…”) porque REG-UI-11 aplica
  a `SearchInput`/`DataTable`.
- Sin degradados; solo tokens (`--sasha-danger`, `--sasha-texto-primary`, etc.).

## 6. Archivos afectados

| Archivo | Tipo | Líneas de referencia |
|---|---|---|
| `src/lib/examenesErrores.ts` | **nuevo** | — |
| `src/components/examenes/ExamenOpcionesAlert.tsx` | **nuevo** | — |
| `src/routes/_app/examenes.tsx` | modificar | 32-41, 66-70, 302-339, 322, 399-408 |
| `src/components/examenes/ExamenWizard.tsx` | modificar | 48-54, 145-156, 240-258, 289-301, 563-566, 604-641, 749-790, 852-891 |
| `src/tests/e2e/examenes-errores.spec.ts` | **nuevo** | — |
| `documentacion/MAPA.md` | solo si se aprueba | 94-98, 116 |

No se tocan: `src/lib/api.ts`, `src/components/ui/DataTable.tsx`,
`src/components/ui/Combobox.tsx`, `src/styles/*.css`, backend ni base de datos.
La actualización del MAPA se pregunta al terminar (regla MAPA del workspace).

## 7. Etapas

### Etapa 1 — Helper de mensajes del módulo

- **Qué:** crear `src/lib/examenesErrores.ts` con `ExamenOpcionesFallo`,
  `describirFalloOpciones(err)` y `describirVacioOpciones(conteos)` según 5.1.
- **Archivos:** `src/lib/examenesErrores.ts`.
- **Verificación:** `pnpm tsc --noEmit`; revisar a mano que 403/404/500/red den títulos
  distintos y que un `Error` cualquiera caiga en `userMessageFromError`.
- **Aceptación:** los cuatro casos devuelven `{ titulo, detalle }` no vacíos; el 500 incluye
  `requestId` cuando el `ApiError` lo trae; no se duplica la lógica de `api.ts`.

### Etapa 2 — Componente `ExamenOpcionesAlert`

- **Qué:** crear el banner con `role="alert"`, título con token de peligro, detalle,
  `request_id` opcional y botón **Reintentar**; enlace a periodos condicionado.
- **Archivos:** `src/components/examenes/ExamenOpcionesAlert.tsx`.
- **Verificación:** `pnpm tsc --noEmit`; `pnpm lint src/components/examenes/ExamenOpcionesAlert.tsx`;
  render temporal con props de prueba (sin ruta mockeada) y revisar que no use gradientes.
- **Aceptación:** `data-testid="examenes-opciones-alerta"` visible, botón
  `examenes-opciones-reintentar` deshabilitado con `reintentando`, y el enlace solo aparece
  si se permite.

### Etapa 3 — Query, banner y bloqueo de Agregar en `/examenes`

- **Qué:** usar `isError`, `error`, `refetch`, `isFetching`; calcular `fallo`/`vacio`; toast
  único con `useRef`; pintar el banner vía `beforeTable`; ajustar `canAdd`.
- **Archivos:** `src/routes/_app/examenes.tsx`.
- **Verificación:** `pnpm tsc --noEmit`; con `page.route` manual (o etapa 8) comprobar 404:
  banner visible, botón `examen-add-button` ausente, lista y filtros siguen funcionando;
  al reintentar con 200 vuelve el botón.
- **Aceptación:** un fallo nunca deja combos vacíos sin aviso; el toast sale una vez; el vacío
  200 muestra banner sin toast; `canAdd` es `false` con error o sin periodos.

### Etapa 4 — Propagar el estado al wizard

- **Qué:** ampliar `ExamenWizardProps` y pasar `opcionesFallo`, `onReintentarOpciones` y
  `reintentando` desde la ruta; mostrar el aviso compacto al inicio del paso 0.
- **Archivos:** `src/routes/_app/examenes.tsx` (399-408), `src/components/examenes/ExamenWizard.tsx` (48-54).
- **Verificación:** `pnpm tsc --noEmit`; abrir **Editar** de una fila con la ruta de opciones
  en 404 y confirmar que el wizard avisa y permite reintentar.
- **Aceptación:** el wizard abierto en edición no finge que hay catálogo; el aviso y el botón
  funcionan sin cerrar el modal.

### Etapa 5 — Estados vacíos en los selectores del paso 0

- **Qué:** `emptyLabel` por combo (periodo, parcial, modalidad), mensaje bajo el selector de
  periodo y enlace condicionado a `/catalogos/periodos`.
- **Archivos:** `src/components/examenes/ExamenWizard.tsx` (604-641).
- **Verificación:** `pnpm tsc --noEmit`; `pnpm lint` del archivo; abrir el wizard con
  `opciones.periodos = []` y con periodo sin parciales.
- **Aceptación:** cada combo explica su vacío con texto propio; el enlace aparece solo con
  `catalogos:get`; no se cambian placeholders de búsqueda.

### Etapa 6 — Siguiente deshabilitado con datos faltantes

- **Qué:** calcular `datosFaltantes` en el paso 0, deshabilitar **Siguiente** y mostrar
  “Falta: …” con `aria-live`; conservar `validarDatos()` para errores de rango.
- **Archivos:** `src/components/examenes/ExamenWizard.tsx` (240-258, 289-301, 563-566).
- **Verificación:** `pnpm tsc --noEmit`; abrir el wizard vacío y comprobar que no hay toast al
  intentar avanzar; completar los campos y ver el botón habilitarse.
- **Aceptación:** el botón está deshabilitado y la lista de faltantes coincide con lo vacío;
  los errores de fechas fuera del parcial siguen mostrando toast.

### Etapa 7 — Estados vacíos de supervisores y tablero

- **Qué:** `emptyLabel` para maestro y sección de supervisores; aviso en el paso 3 cuando
  `pills.length === 0` (“No hay asignaciones para este periodo y modalidad; revisa el plan de
  estudio del periodo”) y ocultar los filtros de grado/sección vacíos.
- **Archivos:** `src/components/examenes/ExamenWizard.tsx` (749-790, 852-891);
  lectura de `src/components/examenes/ExamenBoard.tsx:90-113` (sin modificarlo).
- **Verificación:** `pnpm tsc --noEmit`; paso 3 con `asignaciones = []` y con modalidad sin
  secciones.
- **Aceptación:** ningún selector queda mudo; el tablero explica la ausencia de pastillas;
  no hay choques con `ExamenBoard`.

### Etapa 8 — E2E de 404, 403 y 200 vacío

- **Qué:** crear `src/tests/e2e/examenes-errores.spec.ts` con `loginAs` y
  `page.route(/\/api\/examenes\/opciones(\?.*)?$/, ...)` registrado antes de navegar:
  - **404:** `text/plain` “404 page not found” → banner “El módulo de exámenes no está
    disponible”, `examen-add-button` con `toHaveCount(0)`, toast ≤ 1; luego `page.unroute`
    y **Reintentar** → banner desaparece y botón visible.
  - **403:** JSON `{ message: 'No tienes permiso' }` → banner “Tu rol no puede ver el
    catálogo…” y un solo `[data-sonner-toast]` (esperar 1–2 s y volver a contar).
  - **200 vacío:** JSON con los 8 arreglos vacíos → banner “No hay periodos académicos
    configurados”, enlace con `href="/catalogos/periodos"`, `[data-sonner-toast]` en 0.
- **Archivos:** `src/tests/e2e/examenes-errores.spec.ts`.
- **Verificación:** `pnpm exec playwright test src/tests/e2e/examenes-errores.spec.ts`.
  Usar `timeout: 10_000` en las aserciones de 404/500 por el reintento automático.
- **Aceptación:** los 3 casos pasan en serie (`workers: 1`), sin depender de backend nuevo;
  el fixture `loginAs` y el admin `1002026100` son los existentes
  (`src/tests/e2e/fixtures/auth.ts:26-51`).

### Etapa 9 — Regresión visual y responsive

- **Qué:** dentro del mismo spec, repetir el caso 404 en viewport 1366×900 y 390×844;
  comprobar que el banner no desborda (`document.documentElement.scrollWidth <= innerWidth`),
  que el botón **Reintentar** es visible y clickeable en móvil y que la tabla pasa a cards
  como hoy.
- **Archivos:** `src/tests/e2e/examenes-errores.spec.ts`.
- **Verificación:** `pnpm exec playwright test src/tests/e2e/examenes-errores.spec.ts`;
  adjuntar captura manual de ambos tamaños en la sesión.
- **Aceptación:** sin scroll horizontal a 390 px, banner legible, sin degradados y colores de
  tokens; el flujo normal (200 con datos) no cambia.

### Etapa 10 — Cierre: lint, build y MAPA

- **Qué:** correr los comandos de la sección 8; preguntar si se actualiza
  `documentacion/MAPA.md:94-98` y `:116` con la nueva conducta de errores.
- **Archivos:** `documentacion/MAPA.md` solo tras aprobación.
- **Verificación:** comandos de la sección 8 en verde.
- **Aceptación:** `pnpm lint` sin errores nuevos, `pnpm build` correcto y MAPA decidido
  explícitamente (sí o no), sin editarlo en silencio.

## 8. Pruebas y comandos exactos

```bash
pnpm tsc --noEmit
pnpm lint src/lib/examenesErrores.ts src/components/examenes/ExamenOpcionesAlert.tsx src/components/examenes/ExamenWizard.tsx src/routes/_app/examenes.tsx src/tests/e2e/examenes-errores.spec.ts
pnpm build
pnpm exec playwright test src/tests/e2e/examenes-errores.spec.ts
```

- `pnpm lint` es `eslint` (`package.json:11`), por eso acepta rutas.
- El e2e levanta su backend en `:8081` y su front en `:3001`
  (`playwright.config.ts:11-14, 44-67`); no requiere backend nuevo porque todo el fallo se
  simula con `page.route`.
- Prueba manual rápida: `pnpm dev`, entrar como `1002026100` / `Admin123!`, y con las
  DevTools en “offline” recargar `/examenes` para ver el caso de red.

## 9. Riesgos y rollback

- **Botón que desaparece:** `DataTable` oculta **Agregar** cuando `canAdd` es `false`
  (`DataTable.tsx:341-345`). Mitigación: el banner dice explícitamente que se habilita al
  reintentar con éxito. No se modifica `DataTable`.
- **Doble espera en 404/500:** `AppProviders` reintenta una vez (`:15-19`), así que el banner
  tarda dos intentos. Mitigación: `timeout: 10_000` en e2e y texto de “Reintentar” claro.
- **Toast repetido:** si el `useEffect` depende de `error` sin clave, cada refetch puede
  duplicarlo. Mitigación: clave `${status}:${requestId ?? titulo}` en `useRef`.
- **Vacío confundido con error:** 200 con arreglos vacíos no es `isError`; si solo se mira
  `isError`, no habría aviso. Mitigación: `describirVacioOpciones` en la misma rama de UI,
  sin toast.
- **Wizard en edición con catálogo caído:** el detalle ya trae periodo/parcial/modalidad, pero
  el tablero y supervisores dependen de `opciones`. Mitigación: aviso + **Siguiente**
  deshabilitado solo si faltan datos; **Guardar** de una edición existente no se bloquea.
- **Enlace a periodos sin permiso:** el usuario de exámenes puede no tener `catalogos:get`.
  Mitigación: el enlace se condiciona con `useCan` y se ofrece el texto alternativo.
- **Rollback:** revertir `examenes.tsx` y `ExamenWizard.tsx`, borrar
  `examenesErrores.ts`, `ExamenOpcionesAlert.tsx` y `examenes-errores.spec.ts`. Sin cambios
  de backend, contrato ni base de datos, por lo que **no requiere migración**.

## 10. Criterios de aceptación globales

1. Un 403, 404, 500 o fallo de red en `/examenes/opciones` produce un banner con
   `role="alert"`, mensaje específico y botón **Reintentar**; nunca un combo vacío silencioso.
2. El 500 muestra `request_id` cuando el backend lo envía; el 404 distingue “módulo no
   desplegado”; el 403 menciona `examenes:get`; el fallo de red menciona la conexión.
3. Un 200 con `periodos: []` muestra banner de catálogo vacío con enlace a
   `/catalogos/periodos` (si hay permiso) y **Reintentar**, sin toast de error.
4. **Agregar horario** no está disponible con error o sin periodos, y vuelve al reintentar
   con éxito; la lista, filtros, Excel y acciones de fila siguen operativas.
5. Sale como máximo **un toast por fallo** y la alerta inline permanece visible.
6. En el wizard, cada selector explica su vacío con `emptyLabel` propio; el de periodos
   ofrece `/catalogos/periodos` cuando corresponde.
7. **Siguiente** está deshabilitado si falta periodo, parcial, modalidad o fechas, y se indica
   exactamente qué falta; los errores de rango de fechas siguen avisando.
8. `pnpm tsc --noEmit`, `pnpm lint` de los archivos tocados, `pnpm build` y
   `pnpm exec playwright test src/tests/e2e/examenes-errores.spec.ts` pasan.
9. Desktop y 390 px: sin scroll horizontal, banner legible, botón usable; sin degradados,
   solo tokens; el buscador de la tabla sigue siendo «Buscar…».
10. No se modifican backend, contrato, permisos, `DataTable`, `Combobox`, `api.ts` ni estilos
    globales; no hay migración de base de datos.
