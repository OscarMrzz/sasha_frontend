# Plan de Especificación: Edición de matrícula en el wizard + cambio de responsable - Frontend

## 1. Objetivo

Reutilizar el `MatriculaWizard` para editar una matrícula existente con precarga al 100% (alumno, historial, académico, foto, pago y responsables), permitir restaurar por ventana al estado inicial, y habilitar el cambio de responsable (editar el actual, reemplazar por otro existente, añadir, quitar y desvincular). Hoy el wizard solo crea (`src/components/matricula/MatriculaWizard.tsx`), y la edición de una fila abre `PersonaEditModal`, que edita perfil y datos académicos pero no responsables ni beca, y no dispara recálculo (`src/routes/_app/matricula.tsx:367-384`).

Alcance del cambio de frontend:

- Prop de edición en `MatriculaWizard` con precarga vía `getFicha` + nuevo `getMatricula`.
- Botón "Restaurar" en cada ventana (solo edición) con `data-testid` por paso.
- Guardado en edición: `updatePersona(alumno)`, `updateMatricula(id, ...)`, `linkResponsable` y nuevo `unlinkResponsable`; edición de responsables existentes vía `updatePersona(responsable)`.
- `Editar` (clic derecho) y doble clic abren el wizard en modo edición en lugar de `PersonaEditModal`.
- Servicios y tipos nuevos en `src/services/matricula.ts`.

## 2. Alcance del Módulo (Frontend)

- Componente `MatriculaWizard`, página `matricula.tsx`, servicios `matricula.ts` y `personas.ts` (sin cambios de firma en `personas.ts`), y documentación `documentacion/MAPA.md`.
- Consume el backend extendido `PUT /matricula/{id}` y `DELETE /matricula/{id}/responsables/{responsable_id}`.
- No se toca creación (el wizard sigue creando cuando no recibe la prop de edición).

## 3. Contexto Actual (verificado)

- `MatriculaWizard.tsx`: pasos `alumno, historial, academico, responsables, foto, pago, confirmar` (`:39-47`). Props sin modo edición (`:171-180`); estado de formularios (`:289-303`); `reset()` (`:406-421`); `validateStep` (`:432-502`); `saveMut` de creación (`:549-756`); paso responsables (`:1437-1699`); paso pago/beca (`:1711-1752`); footer con botones Atrás/Siguiente/Confirmar (`:787-847`).
- Responsables en creación: modo `existente` busca con `getResponsableByCode` (`:760-778`); modo `nuevo` usa `createResponsable` + `linkResponsable` (`:649-690`).
- `matricula.tsx`: importa `PersonaEditModal` (`:7`), estado `editRow` (`:51`), doble clic (`:188-190`), ítem de menú `Editar` con `ctx-editar` (`:217-224`) y render de `PersonaEditModal` (`:367-384`).
- `services/matricula.ts`: `Matricula` (`:25-37`) no expone `tipo_beca`/`monto_especial`; `MatriculaUpdate` (`:116-121`) solo tiene 4 campos; `updateMatricula` (`:123-125`); `linkResponsable` (`:136-141`). No existe `getMatricula` ni `unlinkResponsable`.
- `services/personas.ts`: `getFicha(code)` (`:302-309`) devuelve `alumno.matriculas` (con `cursos_retrasados: string[]`, `status`) y `alumno.responsables` (con `user_code`, `parentesco`, `es_principal`, `telefono`, `profesion`) pero **NO** `responsable_id` ni direcciones del responsable. `getResponsableByCode(code)` (`:117-119`) devuelve `id`/`user_code`/`nombre`. `getFicha` de un responsable devuelve `responsable{ id, profesion, direccion_domicilio, direcciones_trabajo[] }` (`:204-210`). `updatePersona(code, PersonaUpdate)` (`:122-124`) cubre perfil + alumno + responsable.
- El backend no expone `responsable_id` en la ficha del alumno (`internal/personas/ficha.go:387-412`), así que el frontend lo resuelve con `getResponsableByCode(user_code)`.
- No existe ningún botón "Restaurar" hoy.
- Tests e2e: Playwright, `testDir` `src/tests/e2e` (`playwright.config.ts:15`), helper `loginAs` en `src/tests/e2e/fixtures/auth.ts` (admin `1002026100` / `Admin123!`). El test `matricula-wizard.spec.ts:105-120` hoy espera `Editar alumno` y `matricula-edit-seccion` de `PersonaEditModal`; debe actualizarse.

## 4. Diseño Propuesto

### 4.1 Prop de edición

`MatriculaWizard` recibe una prop opcional:

```ts
type MatriculaEdicion = { matriculaId: string; alumnoCode: string }
// Props: edicion?: MatriculaEdicion
```

- Ausente → comportamiento actual (creación).
- Presente → modo edición: no se crean usuario ni alumno; se precargan los formularios; se renderiza "Restaurar" por ventana; el footer cambia "Confirmar y guardar" por "Guardar cambios".

### 4.2 Precarga (100%)

Al abrir con `edicion`, un `useEffect` (dependiente de `open`, `edicion.matriculaId`, `edicion.alumnoCode`):

1. `getFicha(alumnoCode)`:
   - `alumno` ← `perfil` (nombres, sexo, fecha_nacimiento, telefono_contacto, numero_identidad).
   - `historial` ← `alumno` (procede_otra_institucion, nombre_institucion_origen, alergias, condiciones, grados_repetidos) — mapeando `grados_repetidos[].grado_nombre` a `grado_id` vía el catálogo de `grados`.
   - `academico` ← la matrícula activa (periodo/`anio_lectivo`, grado y sección por nombre contra catálogos, `es_reingreso`, `cursos_retrasados`). Poner `asignar_seccion_automatica=false` con la sección concreta.
   - **El periodo académico NO se puede cambiar en edición** (decisión del usuario para evitar confusiones de año lectivo/cobros). En modo edición el combobox de `Periodo académico` queda deshabilitado (solo lectura) con una nota; se precarga el periodo actual y no se ofrece cambiarlo.
2. `getMatricula(matriculaId)` → `tipo_beca`, `monto_especial`, `seccion_id`, `periodo_academico_id`, `es_reingreso`, `status`.
3. Responsables: por cada `alumno.responsables[i].user_code` → `getResponsableByCode(user_code)` para obtener `responsable_id`, y `getFicha(user_code)` para `profesion`, `direccion_domicilio`, `direcciones_trabajo[0]` (dirección y teléfono de trabajo). Se crea una `ResponsableCard` en modo `existente` con `user_code`, `responsable_id`, `encontrado_nombre`, `parentesco`, `es_principal`.
4. Foto: en edición `foto` inicia en `null` (el servidor ya tiene `path_imagen`); el paso Foto solo cambia si se elige un archivo nuevo.

Si alguna ficha de responsable falla, se muestra la tarjeta con los datos de `alumno.responsables` y se avisa por toast (degradación parcial, sin romper la precarga).

### 4.3 Snapshot inicial y "Restaurar" por ventana

- Tras la precarga, guardar `snapshot` con copias de `alumno`, `historial`, `academico`, `responsables`, `tipoBeca`, `montoEspecial` (y `foto = null`). Implementación con `structuredClone` o copia manual.
- Botón "Restaurar" visible solo cuando `edicion` existe, uno por ventana, con `data-testid={matricula-restaurar-<stepId>}` (`alumno`, `historial`, `academico`, `responsables`, `foto`, `pago`).
- Cada botón restaura solo el slice del paso activo desde `snapshot`:
  - `alumno` → `setAlumno(snapshot.alumno)`
  - `historial` → `setHistorial(snapshot.historial)`
  - `academico` → `setAcademico(snapshot.academico)`
  - `responsables` → `setResponsables(snapshot.responsables)`
  - `foto` → `setFoto(null)` (conserva la foto existente del servidor)
  - `pago` → `setTipoBeca(snapshot.tipoBeca)`, `setMontoEspecial(snapshot.montoEspecial)`
- No hay confirmación para "Restaurar" (es solo estado local); el botón "Cancelar" sigue pidiendo confirmación antes de cerrar.

### 4.4 Guardado en edición

`saveMut` gana una rama `if (edicion)`:

1. `updatePersona(alumnoCode, {...})` con perfil + datos de alumno (historial: procede_otra_institucion, alergias, condiciones, grados_repetidos). La foto, si se eligió archivo nuevo, se sube antes con `upload(..., 'perfil_foto')` y se pasa `path_imagen`.
2. `updateMatricula(matriculaId, { seccion_id, es_reingreso, tipo_beca, monto_especial, cursos_retrasados })`. **No se envía `periodo_academico_id`** (el periodo no se puede cambiar en edición). Enviar siempre `tipo_beca` (y `monto_especial` solo si `especial`) para que "normal" limpie la beca. `cursos_retrasados` con el arreglo reconstruido (`[]` para limpiar). Esto dispara el recálculo en backend (por grado y/o beca).
3. Responsables:
   - Tarjetas `existente` con `responsable_id`: `updatePersona(user_code, {...})` con datos editados (teléfono, profesión, direcciones) y `linkResponsable(matriculaId, { responsable_id, parentesco, es_principal })` para reactualizar parentesco/principal.
   - Tarjetas nuevas (`nuevo`): `createResponsable` + `linkResponsable` (igual que en creación).
   - Tarjetas que estaban en el snapshot y ya no están: `unlinkResponsable(matriculaId, responsable_id)`.
   - El "cambio de responsable" es, por tanto, desvincular el anterior + vincular el nuevo (vínculo global alumno↔responsable).
4. Sin generación de ZIP de credenciales en edición. `onSuccess`: toast, `onSaved()` (invalidar queries) y cerrar.

`validateStep` se reutiliza tal cual; en edición no cambian sus reglas (los campos requeridos ya vienen precargados).

### 4.5 Página `matricula.tsx`

- Reemplazar el uso de `PersonaEditModal` por el wizard en edición: nuevo estado `editWizard: Matricula | null` (o `{matriculaId, alumnoCode}`).
- Clic derecho (`ctx-editar`, `:217-224`) y doble clic (`:188-190`) fijan `editWizard` en vez de `editRow`.
- Render:

  ```tsx
  {editWizard?.alumno_code ? (
    <MatriculaWizard
      edicion={{ matriculaId: editWizard.id, alumnoCode: editWizard.alumno_code }}
      open
      onClose={() => setEditWizard(null)}
      onCreated={() => { /* invalidar matriculas, alumnos, persona-ficha */ }}
      periodos={periodos} secciones={secciones} grados={grados}
      modalidades={modalidades} cursos={cursos}
    />
  ) : null}
  ```

- Quitar el bloque `PersonaEditModal` (`:367-384`) y su import (`:7`). `UserFichaModal` (Ver) y "Eliminar" no cambian.

### 4.6 Servicios (`src/services/matricula.ts`)

- Extender `Matricula`: añadir `tipo_beca?: string` y `monto_especial?: number`.
- Extender `MatriculaUpdate`: añadir `tipo_beca?`, `monto_especial?`, `cursos_retrasados?: { curso_id: string; anio_previo: number; anio_actual: number }[]`.
- Nuevo:

  ```ts
  export async function getMatricula(id: string) {
    return apiRequest<Matricula>(`/matricula/${id}`)
  }
  export async function unlinkResponsable(matriculaId: string, responsableId: string) {
    return apiRequest<void>(`/matricula/${matriculaId}/responsables/${responsableId}`, { method: 'DELETE' })
  }
  ```

### 4.7 UI y estilos

- Reusar clases existentes: `wizard-pane`, `wizard-grid`, `wizard-choice`, `wizard-summary`, `btn btn--ghost`, `Field`, `Combobox`. Sin degradados ni tokens nuevos.
- El botón "Restaurar" se coloca junto al título de cada ventana (`wizard-pane__title`) con `btn btn--ghost btn--sm`.

## 5. Archivos a Tocar

| Archivo | Cambio |
|---|---|
| `src/components/matricula/MatriculaWizard.tsx:171-180` | Prop `edicion?`. |
| `src/components/matricula/MatriculaWizard.tsx` (nuevos) | `useEffect` de precarga, `snapshot`, botones "Restaurar" por paso. |
| `src/components/matricula/MatriculaWizard.tsx:549-756` | Rama de edición en `saveMut` (updatePersona/updateMatricula/link/unlink). |
| `src/components/matricula/MatriculaWizard.tsx:787-847` | Footer: "Guardar cambios" y "Restaurar" en edición. |
| `src/components/matricula/MatriculaWizard.tsx:1437-1699` | Paso responsables en edición (tarjetas existente con `responsable_id`; quitar = marcar para unlink). |
| `src/services/matricula.ts:25-37, 116-141` | Tipos `Matricula`/`MatriculaUpdate` y funciones `getMatricula`/`unlinkResponsable`. |
| `src/routes/_app/matricula.tsx:7, 51, 188-190, 217-224, 367-384` | Abrir wizard en edición; retirar `PersonaEditModal`. |
| `documentacion/MAPA.md` | Documentar el wizard en modo edición y el endpoint DELETE de responsable. |

## 6. Contratos / Endpoints (consumidos)

- `GET /personas/ficha/{alumnoCode}` → perfil + alumno (matrículas, responsables sin `responsable_id`).
- `GET /personas/ficha/{responsableCode}` → `responsable{ id, profesion, direccion_domicilio, direcciones_trabajo[] }`.
- `GET /personas/responsables/by-code/{code}` → `id` (`responsable_id`), `user_code`, `nombre`.
- `GET /matricula/{id}` (nuevo, backend `matricula:get`) → incluye `tipo_beca`, `monto_especial`.
- `PUT /personas/{code}` → perfil + alumno + responsable (100x100).
- `PUT /matricula/{id}` → `seccion_id`, `periodo_academico_id`, `es_reingreso`, `status`, `tipo_beca`, `monto_especial`, `cursos_retrasados`.
- `POST /matricula/{id}/responsables` → vincula/reactiva.
- `DELETE /matricula/{id}/responsables/{responsable_id}` (nuevo) → desvincula.

## 7. Migración

No aplica al frontend. No se crean migraciones.

## 8. Riesgos y Decisiones

- **`PersonaEditModal` se retira de matrícula.** El flujo de edición de perfil académico pasa al wizard. Impacto directo en el e2e `matricula-wizard.spec.ts:105-120`, que debe reescribirse (ver sección 9). `PersonaEditModal` sigue existiendo para otras páginas.
- **`responsable_id` no viene en la ficha del alumno.** Se resuelve con `getResponsableByCode(user_code)` por cada responsable (una llamada por responsable). Alternativa futura: exponer `responsable_id` en la ficha (cambio de backend no incluido en este plan).
- **Direcciones del responsable.** La ficha del alumno no trae `direccion_domicilio`/`direcciones_trabajo`; se obtienen con `getFicha(responsableCode)`. El modelo del wizard maneja una sola dirección de trabajo (`direccion_trabajo`/`telefono_trabajo`); si el responsable tiene varias, se precarga la primera y las demás se conservan vía `updatePersona` solo si el frontend reenvía el arreglo completo. Decisión: al editar un responsable se reenvía el arreglo con la dirección de la tarjeta (se simplifica a una). Documentar al usuario.
- **"Restaurar" en Foto.** Resetea a `null` (sin archivo nuevo). No borra ni revierte la foto almacenada en el servidor.
- **"Restaurar" no revierte el servidor.** Es solo estado local del formulario; los cambios persisten únicamente al guardar.
- **Sesión de precarga.** Mientras carga, mostrar el wizard en estado "Cargando…" y no permitir guardar hasta tener ficha y matrícula.
- **Beca en el resumen.** El resumen de "Confirmar" ya muestra la beca (`beca-resumen`, `:1856-1859`); en edición debe reflejar el valor precargado y los cambios antes de guardar.

## 9. Tests (e2e)

Nuevo `src/tests/e2e/matricula-edicion.spec.ts`:

- Precarga: clic derecho en la primera fila → `Editar` abre el wizard en modo edición con los datos del alumno (nombre), grado/sección y beca ya cargados.
- "Restaurar" por ventana: modificar un campo de Académico y de Pago, pulsar `matricula-restaurar-academico` / `matricula-restaurar-pago`, verificar que cada ventana vuelve al valor inicial.
- Editar responsable existente: cambiar teléfono y verificar que se envía/refleja.
- Reemplazar responsable por código: buscar un `user_code` distinto con `getResponsableByCode` y confirmar el nuevo vínculo.
- Desvincular: quitar una tarjeta de responsable y verificar que se llama `unlinkResponsable`.
- Cambio de beca y de grado: cambiar a media beca y a otro grado, guardar, y verificar que el resumen y la tabla reflejan los cambios (el recálculo en backend no se inspecciona desde el e2e, solo el efecto en pantalla).

Actualizar `src/tests/e2e/matricula-wizard.spec.ts:105-120`: reemplazar las expectativas de `Editar alumno` / `matricula-edit-seccion` por las del wizard en edición (p. ej. heading del wizard en modo edición y `matricula-restaurar-*`).

Comando:

```
pnpm exec playwright test src/tests/e2e/matricula-edicion.spec.ts
pnpm exec playwright test src/tests/e2e/matricula-wizard.spec.ts
```

## 10. Fuera de Alcance

- Edición de la foto del alumno como flujo dedicado (solo se reutiliza `PhotoCapture`).
- Historial completo de cambios de responsable (solo el estado final del vínculo).
- Exponer `responsable_id` en la ficha backend (fuera de este plan).
- Recálculo o vista de obligaciones dentro del wizard (el recálculo ocurre en backend y se verifica en sus tests; el frontend no muestra obligaciones).
- Refactor de `PersonaEditModal` (se conserva para otras páginas).
