# Plan de Especificación: Periodos con parciales anidados y configuración por periodo — Frontend

> Feature `001-periodos-parciales` · Plataforma escolar Sasha · capa **frontend** (`sasha_fronted/`) · v1
> Fuente de requisitos: decisiones cerradas con el usuario (v1).
> Referencias de código citadas abajo; son puntos de anclaje reales, no código nuevo.

---

## 1. Visión General y Objetivos

- **Problema.** Hoy los parciales se administran en un modal aparte (`ParcialesPeriodoModal`) y las fechas del periodo se capturan a mano como inputs “Fecha inicio”/“Fecha fin”, lo que deja al periodo y a sus parciales como dos verdades separadas y permite incoherencias (fechas del periodo que no coinciden con ningún parcial). Además, los umbrales de calificación (“Mínima aprobación”, “Honor al mérito”, “Excelencia”) son **globales** en `/configuracion`, cuando deberían depender del periodo, y el “Programa académico SACE” (`modalidad_sace`) vive en Configuración cuando corresponde al **grado**.
- **Objetivo v1.** Que el formulario del **periodo** sea la única fuente de verdad:
  1. dentro del mismo modal, una sección de **parciales con filas repetibles** (mismo patrón y estilo que “Nuevo tipo de ficha”, ver `src/components/disciplina/TipoFichaModal.tsx`), con botón **+ Agregar**, quitar fila y guardado en un solo paso con `ConfirmDialog`;
  2. cada parcial tiene **número** (1, 2, 3…), **nombre autogenerado** (“I parcial”, “II parcial”…, no editable), **`fecha_inicio`**, **`fecha_fin`** y **`nota_maxima`** (default 100);
  3. las fechas del periodo **dejan de ser inputs** y pasan a mostrarse **derivadas** (solo lectura) del primer y último parcial;
  4. el periodo configura sus propios **umbrales** (mínima aprobación, honor al mérito, excelencia) dentro del bloque “Promoción y recuperaciones”;
  5. Configuración pierde los umbrales y el “Programa académico SACE”; el **grado** gana “Programa académico SACE”.
- **Fuera de alcance (v1).** Cambios de backend (se documenta el contrato que el frontend consume, no se implementa aquí); app móvil (`sasha_movil/`); reordenar parciales por arrastre (no pedido — las filas se quitan y se agregan, el orden lo da el número); generación de PDF.

### 1.1 Contexto técnico verificado (rutas reales)

Frontend React 19 + TanStack Start (`sasha_fronted/`):

- **Página del periodo (a modificar):** `src/routes/_app/catalogos/periodos.tsx`. Hoy: modal de alta/edición con `Modal` + `Field` + `Combobox`, bloque `fieldset.periodo-reglas` (`REGLAS`, `data-testid="periodo-reglas"`), inputs “Fecha inicio”/“Fecha fin”, menú contextual de fila con la opción `data-testid="periodo-ctx-parciales"` que abre `ParcialesPeriodoModal`, y guardado con `ConfirmDialog` (`confirmSave`).
- **Modal de parciales a retirar:** `src/components/catalogos/ParcialesPeriodoModal.tsx` (tabla de parciales + alta/edición con número, nombre, inicio, fin; helper exportado `mesesDelRango`).
- **Patrón de filas repetibles a clonar:** `src/components/disciplina/TipoFichaModal.tsx` — `Modal xl`, secciones con `.expediente__seccion`/`.expediente__titulo`, lista `.niveles` con filas `.nivel-fila`, botón **+ Agregar** (`data-testid="tipo-agregar-nivel"`), quitar fila `.nivel-fila__quitar` (`Trash2`), validación `error`, `ConfirmDialog` antes de guardar y uso de `useDismiss`. Estilos en `src/styles/style1.css` (`.ficha-form`, `.expediente__seccion`, `.niveles`, `.nivel-fila`, `.niveles__pie`).
- **Grado (a modificar):** `src/routes/_app/catalogos/grados.tsx` — modal con `Field` “Código SACE” y “Detalles”, `defaultForm: GradoCreate`, `data-testid="grado-save-button"`, `grado-nombre-input`. Hoy no tiene “Programa académico SACE”.
- **Configuración (a modificar):** `src/routes/_app/configuracion.tsx` — `emptyForm`/`configToForm` con `calificacion_minima_aprobacion`, `calificacion_honor_merito`, `calificacion_excelencia`, `calificacion_rango_bajo`, `modalidad_sace`; sección “Umbrales de calificación”; campo “Programa académico SACE”.
- **Modalidades (a revisar):** `src/routes/_app/catalogos/modalidades.tsx` — wizard con paso “Parciales” que edita `cantidad_parciales_por_periodo` y `duracion_parcial_dias`; resumen final que los muestra.
- **Consumidores de umbrales (revisar, sin cambiar contrato):** `src/routes/_app/calificaciones.tsx` (`etiquetaPromedio(p, u)` usa `u.excelencia`/`u.honor`/`u.minima`); `src/components/portal/notas-ui.tsx` (comentario y `claseNivelNota`); `src/services/calificaciones.ts` (`ResumenCalificaciones.umbrales: { minima; honor; excelencia }`, línea ~167).
- **Servicios:** `src/services/catalogos.ts` (`Grado`/`GradoCreate`, `Modalidad`/`ModalidadCreate`, `Parcial`/`ParcialInput`, `Periodo`/`PeriodoCreate`, `listParciales`/`createParcial`/`updateParcial`), `src/services/configuracion.ts` (`Configuracion`/`ConfiguracionUpdate`).
- **UI base:** `src/components/ui/Modal.tsx` (`useDismiss`, `wide`, `xl`), `ConfirmDialog.tsx`, `Field.tsx`, `Combobox.tsx`, `DataTable.tsx`; gating `src/components/gates/Can.tsx` (`RequirePermission`, `Can`, `useCan`); tokens en `src/styles/tokens.css`, BEM en `src/styles/style1.css`.
- **E2E:** `src/tests/e2e/` (Playwright) con `fixtures/auth.ts` (`loginAs`); ejemplo de catálogo `catalogos.spec.ts`.

---

## 2. Historia de Usuario y Criterios de Aceptación

- **Historia.** Como **admin / admin_temporal** (rol con `catalogos:post`/`catalogos:put`), quiero **definir un periodo con sus parciales y sus umbrales en un solo formulario**, para **tener una sola fuente de verdad coherente entre fechas, parciales y reglas de calificación**.

Criterios de aceptación:

1. **Parciales dentro del formulario.** Dado un usuario con `catalogos:post` en `/catalogos/periodos`, cuando pulsa “Agregar periodo”, entonces el modal muestra, además de los datos del periodo, la sección **Parciales** con al menos una fila y el botón **+ Agregar**.
2. **Filas repetibles.** Dado el formulario del periodo, cuando pulsa **+ Agregar** tres veces, entonces hay 3 filas, cada una con **número** (1, 2, 3…), **nombre autogenerado** “I parcial”/“II parcial”/“III parcial” (no editable), `Fecha inicio`, `Fecha fin` y `Nota máxima` (default `100`), y cada fila tiene su botón quitar.
3. **Nombre automático.** Dado el parcial número 4, cuando se renderiza, entonces su nombre es “IV parcial” y **no** hay input de nombre editable.
4. **Nota máxima.** Dado un parcial, cuando se edita `Nota máxima`, entonces el valor viaja en `nota_maxima` del parcial (numérico; default 100).
5. **Fechas derivadas del periodo.** Dado un periodo con parciales con fechas, cuando se rellena el primer y el último parcial, entonces los campos “Fecha inicio”/“Fecha fin” del periodo se muestran **solo lectura** y reflejan la menor `fecha_inicio` y la mayor `fecha_fin`; ya no son inputs editables. Sin parciales con fecha, muestran “—”.
6. **Umbrales por periodo.** Dado el formulario del periodo, cuando se abre la sección “Promoción y recuperaciones”, entonces contiene **Mínima aprobación**, **Honor al mérito** y **Excelencia**, sin duplicar la mínima aprobación con `nota_minima` (se reutiliza `nota_minima` como “Mínima aprobación”).
7. **Guardar todo de una vez.** Dado el formulario con cambios, cuando pulsa Guardar, entonces aparece un `ConfirmDialog` y, al confirmar, se persisten periodo **y** parciales en una sola operación, con `dirty` que bloquea Guardar si no hay cambios.
8. **Configuración sin umbrales ni SACE.** Dado un usuario con `configuracion:get`, cuando abre `/configuracion`, entonces **no** ve “Mínima aprobación”, “Honor al mérito”, “Excelencia”, “Rango bajo” ni “Programa académico SACE”; sí ve “Nombre de la institución” y “Código SACE institucional”.
9. **Grado con Programa académico SACE.** Dado un usuario con `catalogos:post`, cuando edita un grado, entonces ve el campo **Programa académico SACE** (`modalidad_sace`, placeholder “Ej. BACHILLERATO TÉCNICO PROFESIONAL EN INFORMÁTICA”) y se persiste en `Grado`.
10. **Menú contextual sin Parciales.** Dado el listado de periodos, cuando se abre el clic derecho de una fila, entonces ya **no** aparece la opción “Parciales”.
11. **Umbrales desde el periodo (sin romper contrato).** Dado `/calificaciones` con `GET /calificaciones/resumen`, entonces sigue leyendo `umbrales: { minima, honor, excelencia }` con la misma forma; solo cambia que el backend los toma del periodo.

---

## 3. Arquitectura Frontend

### 3.1 Archivos a crear

| Archivo | Propósito |
|---|---|
| `sasha_fronted/src/components/catalogos/ParcialesPeriodoForm.tsx` | Sección reutilizable de **parciales con filas repetibles** (patrón y estilo de `TipoFichaModal`): estado de filas, **+ Agregar**, quitar fila, cálculo de nombre autogenerado y fechas derivadas, validación. Se monta dentro del modal de periodo. |
| `sasha_fronted/src/helpers/parciales.ts` | Helpers puros: `parcialNombre(numero)` → romano + “ parcial” (`1 → "I parcial"`), `mesesDelRango(inicio, fin)` (movido desde `ParcialesPeriodoModal` si aún se necesita para el resumen), `derivarFechasPeriodo(parciales)` → `{ fecha_inicio, fecha_fin }`. |
| `sasha_fronted/src/tests/e2e/periodos.spec.ts` | E2E Playwright del flujo completo (ver §9). |

### 3.2 Archivos a modificar

| Archivo | Cambio |
|---|---|
| `sasha_fronted/src/routes/_app/catalogos/periodos.tsx` | Integrar `ParcialesPeriodoForm`; quitar los inputs “Fecha inicio”/“Fecha fin” y mostrarlos derivados; añadir umbrales al `fieldset.periodo-reglas`; quitar el estado `parcialesDe` y el `ParcialesPeriodoModal`; quitar la opción `periodo-ctx-parciales` del menú contextual; sembrar/editar `form.parciales`; enviar `parciales` en `createPeriodo`/`updatePeriodo`; `dirty` para habilitar Guardar. |
| `sasha_fronted/src/routes/_app/catalogos/grados.tsx` | Añadir `Field` “Programa académico SACE” (`modalidad_sace`) en el modal; incluirlo en `defaultForm` y en `openEdit`; mostrarlo opcionalmente en el resumen del listado. |
| `sasha_fronted/src/routes/_app/catalogos/modalidades.tsx` | Quitar el paso “Parciales” (índice 4) del wizard, sus validaciones, inputs y filas del resumen (`cantidad_parciales_por_periodo`, `duracion_parcial_dias`); ajustar `STEPS` y el índice de los pasos posteriores. |
| `sasha_fronted/src/routes/_app/configuracion.tsx` | Quitar del `emptyForm`/`configToForm`, la sección “Umbrales de calificación” y el campo “Programa académico SACE”. Ajustar el texto introductorio (los umbrales ahora son por periodo; el programa SACE va en el grado). |
| `sasha_fronted/src/services/catalogos.ts` | Nuevos tipos de parciales anidados y `nota_maxima`; `Periodo`/`PeriodoCreate` con `parciales`; `Grado`/`GradoCreate` con `modalidad_sace`; retirar `ParcialInput`, `listParciales`, `createParcial`, `updateParcial` (quedan sin consumidor). Ver §4. |
| `sasha_fronted/src/services/configuracion.ts` | Quitar `calificacion_minima_aprobacion`, `calificacion_honor_merito`, `calificacion_excelencia`, `calificacion_rango_bajo` y `modalidad_sace` de `Configuracion` y `ConfiguracionUpdate`. Se conserva `codigo_sace`. |
| `sasha_fronted/src/styles/style1.css` | Añadir/ajustar BEM para la sección de parciales reutilizando `.expediente__seccion`, `.ficha-form`, `.niveles`, `.nivel-fila`, `.niveles__pie`; añadir `.parcial-fila__fechanombre` u ajustes mínimos si el layout difiere del de niveles. Nada de degradados. |

### 3.3 Archivos a eliminar

| Archivo | Motivo |
|---|---|
| `sasha_fronted/src/components/catalogos/ParcialesPeriodoModal.tsx` | Su función (alta/edición de parciales en modal aparte) queda cubierta por `ParcialesPeriodoForm` dentro del periodo. Antes de borrar, mover `mesesDelRango` a `src/helpers/parciales.ts` si algún consumidor lo usa (hoy solo se usa dentro del propio modal). |

### 3.4 Descomposición del formulario de periodo

`periodos.tsx` conserva el `Modal` y el estado general (`form`, `editing`, `confirmSave`, `dirty`) y delega la sección de parciales:

- `ParcialesPeriodoForm` recibe `value: ParcialForm[]`, `onChange`, `disabled` (para `viewOnly`) y `periodoStatus` (para bloquear edición si el periodo está `FINALIZED`, si aplica).
- Internamente mantiene las filas con una `key` temporal (patrón `nivelSeq` de `TipoFichaModal`) para no depender del id de servidor al crear.
- Deriva el nombre mostrado con `parcialNombre(numero)`; el número se recalcula por posición al agregar/quitar (1..N).

---

## 4. Servicios y tipos (`src/services`)

### 4.1 `src/services/catalogos.ts`

Parciales anidados en el periodo (el nombre se responde derivado; ya no es input):

```ts
/** Parcial dentro de un periodo. `nombre` lo deriva el backend del `numero` ("I parcial"). */
export interface Parcial {
  id?: string                 // ausente al crear
  numero: number
  nombre: string              // solo lectura (derivado)
  fecha_inicio: string        // ISO yyyy-mm-dd
  fecha_fin: string           // ISO yyyy-mm-dd
  nota_maxima: number         // default 100
  status?: string
}

export interface Periodo {
  // ...campos actuales (nota_minima, max_clases_reprobadas, recuperaciones_periodo,
  //    tope_recuperacion_parcial, tope_recuperacion_periodo, contrato_matricula_*)
  fecha_inicio: string        // derivada en backend del primer parcial (solo lectura en UI)
  fecha_fin: string           // derivada en backend del último parcial (solo lectura en UI)
  umbral_honor: number        // "Honor al mérito"
  umbral_excelencia: number   // "Excelencia"
  parciales: Parcial[]
}

export interface PeriodoCreate {
  nombre: string
  anio_lectivo: number
  status: string
  nota_minima?: number                 // = "Mínima aprobación"
  umbral_honor?: number
  umbral_excelencia?: number
  // ...resto de reglas actuales
  parciales: ParcialInput[]            // arreglo anidado obligatorio (>= 1)
}

export type ParcialInput = Omit<Parcial, 'id' | 'nombre' | 'status'> & { id?: string }
```

- `fecha_inicio`/`fecha_fin` del periodo **no** se envían en `PeriodoCreate` (las deriva el backend). En la UI son solo lectura.
- Se **eliminan** `ParcialInput` (viejo, con `periodo_academico_id`/`nombre`), `listParciales`, `createParcial` y `updateParcial`: tras retirar `ParcialesPeriodoModal` no tienen consumidor. (Los endpoints de backend pueden permanecer por compatibilidad; el frontend deja de usarlos.)
- `Grado` y `GradoCreate` ganan `modalidad_sace?: string`.

```ts
export interface Grado {
  id: string; codigo: string; nombre: string; orden: number; status: string
  codigo_sace?: string
  modalidad_sace?: string   // NUEVO — "Programa académico SACE"
  detalles?: string
}
export interface GradoCreate {
  nombre: string; orden: number; status: string
  codigo_sace?: string
  modalidad_sace?: string   // NUEVO
  detalles?: string
}
```

- `Modalidad`/`ModalidadCreate`: se **quitan** `cantidad_parciales_por_periodo` y `duracion_parcial_dias` (ver §7.4).

### 4.2 `src/services/configuracion.ts`

```ts
export interface Configuracion {
  id: string
  nombre_institucion: string
  codigo_sace?: string
  logo_app_key?: string
  logo_institucion_key?: string
}
export interface ConfiguracionUpdate {
  nombre_institucion?: string
  codigo_sace?: string
  logo_app_key?: string
  logo_institucion_key?: string
}
```

Se retiran `modalidad_sace`, `calificacion_minima_aprobacion`, `calificacion_honor_merito`, `calificacion_excelencia` y `calificacion_rango_bajo`.

### 4.3 Contrato que **no** cambia

- `src/services/calificaciones.ts` → `ResumenCalificaciones.umbrales: { minima; honor; excelencia }` mantiene su forma. `src/routes/_app/calificaciones.tsx` (`etiquetaPromedio`, `resultado`) y `src/components/portal/notas-ui.tsx` no requieren cambios de tipo; solo cambia **de dónde** el backend saca esos valores (antes configuración global, ahora el periodo). Se documenta, no se rompe.

---

## 5. Diseño UI

- **Regla base (REG-UI-04):** formulario en `Modal` con `useDismiss` y **confirmación** antes de guardar (`ConfirmDialog`). La sección de parciales guarda con el mismo Guardar del periodo (una sola operación).
- **Estilo idéntico a “Nuevo tipo de ficha”:** reutilizar las clases `.ficha-form`, `.expediente__seccion`, `.expediente__titulo`, `.niveles`, `.nivel-fila`, `.nivel-fila__quitar`, `.niveles__pie` de `src/styles/style1.css`. El botón de agregar dice **+ Agregar** (`Plus`) y cada fila se puede quitar (`Trash2`), deshabilitando el quitar cuando quede una sola fila (no dejar el periodo sin parciales).
- **Nombre autogenerado:** se muestra como texto/`badge` (“I parcial”, “II parcial”…), **sin** input editable. Los romanos se generan con `parcialNombre` (`1→"I"`… usando numeración romana clásica).
- **Campos por fila:** `Número` (solo lectura o derivado por posición), nombre autogenerado, `Fecha inicio` (`type=date`), `Fecha fin` (`type=date`, `min` = fecha inicio de la fila), `Nota máxima` (`type=number`, `min=0`, `max=100`, default `100`).
- **Fechas derivadas del periodo:** los antiguos inputs “Fecha inicio”/“Fecha fin” se reemplazan por valores **solo lectura** con estilo `texto-muted` (o inputs `disabled`), calculados de la primera y última fila de parciales; sin parciales con fecha muestran “—”.
- **Umbrales por periodo:** en el `fieldset.periodo-reglas` (title “Promoción y recuperaciones”, `data-testid="periodo-reglas"`), agregar `Mínima aprobación` (= `nota_minima`), `Honor al mérito` y `Excelencia`; no duplicar la mínima (`nota_minima` ya es la mínima aprobación).
- **Reglas de color y buscador:** sin degradados (`REG-UI-01`); el buscador del listado sigue siendo «Buscar…» fijo (`REG-UI-11`), sin más texto; el listado mantiene el estilo registros (`REG-UI-12`).
- **`data-testid` nuevos (para e2e):** `periodo-parciales`, `periodo-parcial-agregar`, `periodo-parcial-{i}` (fila), `periodo-parcial-{i}-inicio`, `periodo-parcial-{i}-fin`, `periodo-parcial-{i}-nota-maxima`, `periodo-parcial-{i}-quitar`, `periodo-parcial-{i}-nombre` (nombre derivado), `periodo-fechas-derivadas`, `periodo-umbral-honor`, `periodo-umbral-excelencia`, `grado-modalidad-sace` (en grados). Se conservan `periodo-nota-minima`, `periodo-reglas`, `grado-save-button`, `config-*`.

---

## 6. Navegación y Permisos

- **Sin rutas nuevas.** Las vistas siguen siendo `/catalogos/periodos`, `/catalogos/grados`, `/catalogos/modalidades` y `/configuracion`; no se toca `src/helpers/nav.ts` ni `src/routeTree.gen.ts`.
- **Permisos existentes:**
  - Periodos y grados: `catalogos:get` (ver), `catalogos:post` (crear), `catalogos:put` (editar), `catalogos:delete` (eliminar). Los botones Guardar siguen envueltos en `<Can permission={editing ? 'catalogos:put' : 'catalogos:post'}>`.
  - Configuración: `configuracion:get` / `configuracion:put`.
- **Menú contextual de periodo:** se elimina la opción “Parciales” (`data-testid="periodo-ctx-parciales"`); quedan Ver / Editar / Eliminar como hoy.
- **Sin cambios de rol:** la visibilidad del ítem de catálogos en el nav (consejería/director no lo ven, pero pueden entrar por URL) no se modifica.

---

## 7. Decisiones Técnicas

### 7.1 Un solo guardado con parciales anidados

El formulario mantiene el arreglo de parciales en estado local y lo envía completo dentro de `PeriodoCreate.parciales` en `createPeriodo`/`updatePeriodo`. En edición, cada fila ya existente conserva su `id` y las nuevas van sin `id`; el backend reconcilia (crear/actualizar/eliminar por diferencia). Esto elimina la ventana en que el periodo existe sin parciales y reduce a una sola mutación + un solo toast.

### 7.2 Nombre del parcial: derivado, nunca capturado

El nombre (“I parcial”) se **deriva del número**; no hay campo editable ni se envía desde el frontend (salvo que el backend decida recalcularlo). El frontend lo calcula con `parcialNombre(numero)` para mostrarlo en vivo; el `nombre` que devuelve el backend se usa tal cual en modo lectura.

### 7.3 Fechas del periodo derivadas

El periodo ya no captura fechas; se derivan del mínimo `fecha_inicio` y máximo `fecha_fin` de sus parciales. La UI las muestra solo lectura y el payload no las envía; el backend las persiste/deriva. Se evita la incoherencia actual entre fechas del periodo y de los parciales (que además alimentan la liberación por meses, ver `src/routes/_app/liberacion-notas.tsx`).

### 7.4 Modalidades: se quitan `cantidad_parciales_por_periodo` y `duracion_parcial_dias`

Con los parciales definidos **por periodo** (con fechas explícitas y `nota_maxima`), estos dos campos de la modalidad pierden sentido: el conteo y la duración se derivan del periodo. **Se eliminan** del wizard, del resumen, de `Modalidad`/`ModalidadCreate` y de las validaciones. Justificación: mantenerlos crearía dos fuentes contradictorias (la modalidad dice 4 parciales, el periodo define 3). Si el backend aún los devuelve, el frontend simplemente deja de leerlos.

### 7.5 `modalidad_sace` (Programa académico SACE) va en el grado

El programa académico describe el grado/plan de estudios, no la institución; por eso se captura en `Grado.modalidad_sace` y se retira de Configuración. El `sace.ts` (`institucion.modalidad_sace`) seguirá recibiendo el valor del backend; el frontend no cambia el contrato de exportación.

### 7.6 Umbrales por periodo y su efecto en vistas existentes

Los umbrales dejan de ser globales. El formulario del periodo captura `nota_minima` (mínima aprobación), `umbral_honor` y `umbral_excelencia`. Las vistas que ya consumen `umbrales` siguen igual (`calificaciones.tsx`, `notas-ui.tsx`, `services/calificaciones.ts`): el contrato no cambia de forma, solo su origen.

### 7.7 Estado `dirty` y validación

- `dirty` se activa al tocar cualquier campo (periodo o parciales) y bloquea Guardar si no hay cambios (como `configuracion.tsx` y `TipoFichaModal`).
- Validación mínima antes de permitir Guardar: `nombre` no vacío; ≥ 1 parcial; cada parcial con `fecha_inicio`, `fecha_fin` y `nota_maxima` válida (0–100); `fecha_fin >= fecha_inicio` por fila; parciales en orden por `numero` y fechas no decrecientes (aviso, no bloqueo duro). Sin fechas válidas, el botón Guardar permanece deshabilitado y se muestra una nota de error.

---

## 8. Casos Borde y Manejo de Errores

- **Sin parciales / una sola fila:** no se permite quitar la última fila; un periodo siempre viaja con al menos un parcial. Si el backend devuelve un periodo sin parciales, la UI muestra una fila vacía y avisa.
- **Fechas inconsistentes:** si `fecha_fin < fecha_inicio` en una fila, se marca la fila y se bloquea Guardar hasta corregir.
- **Fechas solapadas o desordenadas entre parciales:** aviso visible (relación con la liberación por meses); no bloqueo duro para no impedir casos legítimos.
- **`nota_maxima` fuera de rango o vacía:** `min=0`, `max=100`; vacío se interpreta como `100` (default).
- **Sin fechas aún:** las fechas derivadas del periodo muestran “—”; Guardar deshabilitado hasta que el primer y último parcial tengan fechas.
- **Periodo `FINALIZED`:** en modo lectura los parciales y umbrales se muestran `disabled` (no se edita un periodo finalizado), coherente con el bloqueo actual de recuperaciones.
- **Modo ver (`viewOnly`):** toda la sección (filas, botón + Agregar, quitar, umbrales) queda deshabilitada y el footer solo muestra Cerrar.
- **Fallo de red / API:** `toast.error(userMessageFromError(e))` (patrón existente) y el `ConfirmDialog` se cierra; el `dirty` se conserva para reintentar.
- **Doble submit:** Guardar deshabilitado mientras `saveMut.isPending`.
- **Descartar cambios:** al cerrar el modal con `dirty`, pedir confirmación (`ConfirmDialog`, patrón de `configuracion.tsx`).
- **Configuración vieja:** si el backend aún devuelve los campos retirados, el frontend los ignora (no se muestran ni se envían).

---

## 9. Tests e2e (Playwright)

Nuevo spec `src/tests/e2e/periodos.spec.ts` (usa `loginAs` de `src/tests/e2e/fixtures/auth.ts`), con los `data-testid` de §5:

1. **Crear periodo con 3 parciales.** Login admin → `/catalogos/periodos` → `data-table-add-button` → rellenar nombre y año → pulsar `periodo-parcial-agregar` dos veces (total 3 filas) → verificar `periodo-parcial-1-nombre` = “I parcial”, `periodo-parcial-2-nombre` = “II parcial”, `periodo-parcial-3-nombre` = “III parcial”.
2. **Nota máxima por parcial.** Setear `periodo-parcial-*` `nota-maxima` (p. ej. 100, 100, 80) y `inicio`/`fin` por fila.
3. **Fechas derivadas.** Verificar que `periodo-fechas-derivadas` muestra la fecha del primer parcial y la del último (solo lectura).
4. **Guardar.** Pulsar Guardar → confirmar en `ConfirmDialog` → toast y la fila del periodo aparece en la tabla.
5. **Editar.** Abrir el periodo creado, cambiar la `nota_maxima` de un parcial, quitar una fila, guardar y verificar persistencia al reabrir.
6. **Configuración limpia.** `/configuracion`: no existen “Mínima aprobación”, “Honor al mérito”, “Excelencia”, “Rango bajo” ni “Programa académico SACE”; sí “Código SACE institucional”.
7. **Grado con SACE.** `/catalogos/grados`: el modal muestra `grado-modalidad-sace`; rellenar y guardar; verificar persistencia.
8. **Menú contextual sin Parciales.** Clic derecho en una fila de periodo: no aparece “Parciales”.

Notas de ejecución: usar `test.describe('periodos @critical')`, limpiar con datos únicos (`Date.now()`) y respetar el patrón de `catalogos.spec.ts` (esperar `data-table-add-button` con `timeout: 15_000`).

---

## 10. Impacto Documental

- **`sasha_fronted/documentacion/MAPA.md`:** actualizar las filas de `/configuracion` (ya sin umbrales ni Programa SACE), `/catalogos/modalidades` (sin paso Parciales), `/catalogos/periodos` (parciales y umbrales dentro del formulario, sin modal de parciales ni opción “Parciales”), `/catalogos/grados` (Programa académico SACE) y la mención correspondiente en la sección de modales.
- **`sasha_fronted/documentacion/API_CLIENTES.md`:** actualizar `Periodos` (parciales anidados, fechas derivadas, umbrales en el periodo), `Grados` (`modalidad_sace`), `Modalidades` (quitar `cantidad_parciales_por_periodo`/`duracion_parcial_dias`) y la sección `Configuración` (quitar umbrales y `modalidad_sace`; queda `codigo_sace`).
- **`sasha_fronted/documentacion/prd.md`:** el punto 10 (Configuración) reubica umbrales a periodo y `modalidad_sace` a grado; actualizar la tabla del glosario (`modalidad` ya no vive en `configuracion_institucion.modalidad_sace`).
- **`sasha_fronted/documentacion/EVOLUCION.md`:** registrar que “Programa SACE” pasa de Configuración a Grado y que la duración/parciales de la modalidad se sustituyen por los parciales del periodo.
- **Regla MAPA:** no se edita ningún MAPA en silencio; al terminar el cambio se **pregunta** si los MAPA van en el commit (ver `AGENTS.md`).
- **Vault (`notas/sasha project/`)** — a proponer (verificar IDs en `Nomenclatura.md` y enlazar a un `IDX-`): decisiones `DEC-` (parciales anidados en el periodo; umbrales por periodo; `modalidad_sace` en grado) y regla `REG-UI` si se formaliza el patrón de “filas repetibles en formulario modal” (hoy vive en `TipoFichaModal`).

---

## 11. Estrategia de Costo Cero / Entorno Local

- Todo corre en el entorno local/gratuito: React 19 + TanStack Start, Vite/pnpm y Playwright (ya en `package.json`); el backend Go + PostgreSQL + MinIO del `docker compose` local.
- No se agregan dependencias nuevas: las filas repetibles, los romanos y la derivación de fechas son funciones propias; no se usa ninguna librería de pago ni servicio externo.
- Sin llamadas a APIs externas ni costos de licencia o cómputo en la nube.
