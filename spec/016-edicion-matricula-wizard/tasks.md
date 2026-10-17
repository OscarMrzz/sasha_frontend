# Checklist de Tareas: Edición de matrícula en el wizard + cambio de responsable — Frontend (016)

> Desglose atómico derivado de [`plan.md`](./plan.md). Frontend Sasha (React 19 + TanStack Start + TanStack Query + Playwright).
>
> **Convenciones**
> - Estado inicial: todas las casillas sin marcar (`- [ ]`).
> - Cada tarea indica **Archivo(s)**, **Qué**, **Verifica** y **Depende de** cuando aplica.
> - Se reutilizan las clases existentes (`wizard-pane`, `wizard-grid`, `wizard-choice`, `wizard-summary`, `btn btn--ghost`, `Field`, `Combobox`). Sin degradados ni tokens nuevos.
> - La creación debe seguir funcionando igual cuando `edicion` no se pasa.
> - Todos los comandos se ejecutan en `sasha_fronted/`.
> - La verificación visual/manual se hace con el usuario admin `1002026100` / `Admin123!`.

---

## Fase 1: Contratos y tipos

- [ ] **T01 — Extender la interfaz `Matricula`**
  - **Archivo(s):** `src/services/matricula.ts` (`Matricula`, l.25-37).
  - **Qué:** agregar `tipo_beca?: string` y `monto_especial?: number`. No cambiar el resto de campos.
  - **Verifica:** `pnpm exec tsc --noEmit`; el tipo refleja la respuesta de `GET /matricula/{id}` y `PUT /matricula/{id}`.
  - **Depende de:** ninguna.

- [ ] **T02 — Extender `MatriculaUpdate`**
  - **Archivo(s):** `src/services/matricula.ts` (`MatriculaUpdate`, l.116-121).
  - **Qué:** agregar `tipo_beca?: string`, `monto_especial?: number` y `cursos_retrasados?: { curso_id: string; anio_previo: number; anio_actual: number }[]`.
  - **Verifica:** `pnpm exec tsc --noEmit`; `updateMatricula` acepta los campos nuevos sin casts.
  - **Depende de:** T01.

- [ ] **T03 — Definir los tipos locales del modo edición en el wizard**
  - **Archivo(s):** `src/components/matricula/MatriculaWizard.tsx` (junto a `Props`, l.171-180).
  - **Qué:** declarar `type MatriculaEdicion = { matriculaId: string; alumnoCode: string }` y `type SnapshotEdicion = { alumno: AlumnoForm; historial: HistorialForm; academico: AcademicoForm; responsables: ResponsableCard[]; tipoBeca: TipoBeca; montoEspecial: number | null }`. Confirmar que `ResponsableCard` ya tiene `responsable_id` (l.100-118) y reutilizarlo.
  - **Verifica:** `pnpm exec tsc --noEmit`; no se duplican tipos existentes.
  - **Depende de:** T01.

## Fase 2: Servicios frontend

- [ ] **T04 — Agregar `getMatricula`**
  - **Archivo(s):** `src/services/matricula.ts`.
  - **Qué:** `export async function getMatricula(id: string) { return apiRequest<Matricula>(\`/matricula/${id}\`) }`.
  - **Verifica:** `pnpm exec tsc --noEmit`; llamada manual devuelve `tipo_beca`, `monto_especial`, `seccion_id`, `periodo_academico_id`, `es_reingreso` y `status`.
  - **Depende de:** T01.

- [ ] **T05 — Agregar `unlinkResponsable`**
  - **Archivo(s):** `src/services/matricula.ts`.
  - **Qué:** `export async function unlinkResponsable(matriculaId: string, responsableId: string) { return apiRequest<void>(\`/matricula/${matriculaId}/responsables/${responsableId}\`, { method: 'DELETE' }) }`.
  - **Verifica:** `pnpm exec tsc --noEmit`; la petición usa `DELETE` y la ruta correcta.
  - **Depende de:** ninguna.

- [ ] **T06 — Verificar que `personas.ts` no requiere cambios de firma**
  - **Archivo(s):** `src/services/personas.ts`.
  - **Qué:** confirmar que `getFicha` (perfil, alumno con `matriculas`/`responsables`, responsable con `profesion`/`direccion_domicilio`/`direcciones_trabajo`), `getResponsableByCode`, `updatePersona` y `createResponsable` cubren la precarga y el guardado. No modificar firmas.
  - **Verifica:** revisión de tipos; `pnpm exec tsc --noEmit`.
  - **Depende de:** ninguna.

## Fase 3: Validación

- [ ] **T07 — Reutilizar `validateStep` en modo edición**
  - **Archivo(s):** `src/components/matricula/MatriculaWizard.tsx` (`validateStep`, l.432-502).
  - **Qué:** mantener las mismas reglas por paso; comprobar que con la precarga completa (alumno, historial, académico, responsables y pago) los pasos quedan válidos sin cambios. No relajar reglas para edición.
  - **Verifica:** recorrer el wizard en edición sin tocar campos y poder llegar a Confirmar.
  - **Depende de:** T10-T13.

- [ ] **T08 — Validar cursos retrasados y sección en edición**
  - **Archivo(s):** `src/components/matricula/MatriculaWizard.tsx`.
  - **Qué:** al reconstruir `cursos_retrasados` para el guardado, descartar filas con `curso_id` vacío y convertir `anio_previo`/`anio_actual` a número (misma semántica que la creación). En académico, exigir `seccion_id` cuando `asignar_seccion_automatica = false` (que es el modo de edición).
  - **Verifica:** una matrícula con cursos retrasados se precarga y guarda sin errores; limpiar todos los cursos envía `[]`.
  - **Depende de:** T12.

- [ ] **T09 — Bloquear el guardado durante la precarga**
  - **Archivo(s):** `src/components/matricula/MatriculaWizard.tsx` (footer, l.787-847).
  - **Qué:** mientras falten ficha o matrícula, mostrar estado "Cargando…" y deshabilitar "Guardar cambios"; no permitir confirmar una edición incompleta. Mantener el diálogo de confirmación de "Cancelar".
  - **Verifica:** al abrir el wizard en edición el botón está deshabilitado hasta terminar la carga; "Cancelar" sigue pidiendo confirmación antes de cerrar.
  - **Depende de:** T15.

## Fase 4: Frontend UI — prop de edición y precarga

- [ ] **T10 — Agregar la prop `edicion`**
  - **Archivo(s):** `src/components/matricula/MatriculaWizard.tsx` (`Props`, l.171-180).
  - **Qué:** agregar `edicion?: MatriculaEdicion`. Ausente: comportamiento actual de creación (crear usuario, alumno, ZIP de credenciales). Presente: no crear usuario ni alumno. Propagar `edicion` al footer, a los paneles y a `saveMut`.
  - **Verifica:** la creación sigue funcionando igual; `pnpm exec tsc --noEmit`.
  - **Depende de:** T03.

- [ ] **T11 — Precargar alumno e historial con `getFicha(alumnoCode)`**
  - **Archivo(s):** `src/components/matricula/MatriculaWizard.tsx` (nuevo `useEffect`).
  - **Qué:** `useEffect` dependiente de `open`, `edicion?.matriculaId` y `edicion?.alumnoCode`: llamar `getFicha(alumnoCode)`; mapear `perfil` a `alumno` (nombres, sexo, fecha_nacimiento, telefono_contacto, numero_identidad) y `alumno` a `historial` (procede_otra_institucion, nombre_institucion_origen, alergias, condiciones, grados_repetidos). Convertir `grados_repetidos[].grado_nombre` a `grado_id` usando el catálogo `grados`; si no hay coincidencia, dejar la fila vacía sin romper.
  - **Verifica:** abrir una matrícula existente muestra nombre, sexo, fecha, contacto, identidad, alergias, condiciones y grados repetidos del alumno.
  - **Depende de:** T10.

- [ ] **T12 — Precargar académico y beca con `getMatricula(matriculaId)`**
  - **Archivo(s):** `src/components/matricula/MatriculaWizard.tsx`.
  - **Qué:** llamar `getMatricula(matriculaId)`; fijar `periodo_academico_id`, `seccion_id`, `es_reingreso`, `status`, `tipo_beca` y `monto_especial`. Resolver `grado_id`/`modalidad_id` desde la sección contra los catálogos `secciones`/`grados`/`modalidades`. Poner `asignar_seccion_automatica = false` con la sección concreta. Reconstruir `cursos_retrasados` desde la matrícula activa de `getFicha`.
  - **Verifica:** el paso Académico muestra periodo, grado, modalidad y sección correctos; el paso Pago muestra la beca y el monto especial precargados.
  - **Depende de:** T11.

- [ ] **T13 — Precargar responsables con `getResponsableByCode` + `getFicha`**
  - **Archivo(s):** `src/components/matricula/MatriculaWizard.tsx`.
  - **Qué:** por cada `alumno.responsables[i].user_code`: llamar `getResponsableByCode(user_code)` para obtener `responsable_id` y `getFicha(user_code)` para `profesion`, `direccion_domicilio`, `direcciones_trabajo[0]` (dirección y teléfono de trabajo). Crear una `ResponsableCard` en modo `existente` con `user_code`, `responsable_id`, `encontrado_nombre`, `parentesco`, `es_principal`, teléfono y demás datos. Respetar el orden y marcar el principal.
  - **Verifica:** el paso Responsables lista todas las tarjetas con nombre encontrado, parentesco y datos editables.
  - **Depende de:** T11.

- [ ] **T14 — Degradación parcial si falla una ficha de responsable**
  - **Archivo(s):** `src/components/matricula/MatriculaWizard.tsx`.
  - **Qué:** si `getFicha(user_code)` falla, construir la tarjeta con los datos de `alumno.responsables` (teléfono, parentesco, principal) y avisar por toast; no abortar la precarga ni bloquear el wizard. Si `getResponsableByCode` falla, dejar `responsable_id` vacío y marcar la tarjeta para revisión.
  - **Verifica:** con un responsable cuyo `user_code` no resuelve, el wizard abre con el resto precargado y muestra el aviso.
  - **Depende de:** T13.

- [ ] **T15 — Foto y estado de carga en edición**
  - **Archivo(s):** `src/components/matricula/MatriculaWizard.tsx`.
  - **Qué:** en edición, `foto` inicia en `null` (el servidor conserva `path_imagen`); el paso Foto solo cambia si se elige un archivo nuevo. Agregar un estado de carga (`cargandoEdicion`) que cubra ficha + matrícula + responsables y se apague al terminar (o al degradar).
  - **Verifica:** abrir edición no borra la foto existente; el estado "Cargando…" desaparece al completar la precarga.
  - **Depende de:** T10-T14.

## Fase 5: Frontend UI — snapshot y "Restaurar" por ventana

- [ ] **T16 — Guardar el snapshot inicial**
  - **Archivo(s):** `src/components/matricula/MatriculaWizard.tsx`.
  - **Qué:** al terminar la precarga, guardar en un estado `snapshot` copias profundas de `alumno`, `historial`, `academico`, `responsables`, `tipoBeca` y `montoEspecial` (y `foto = null`). Usar `structuredClone` o copia manual; no compartir referencias con los estados del formulario.
  - **Verifica:** modificar un campo no altera el snapshot; el snapshot se regenera al reabrir con otra matrícula.
  - **Depende de:** T15.

- [ ] **T17 — Implementar el helper `restaurarPaso`**
  - **Archivo(s):** `src/components/matricula/MatriculaWizard.tsx`.
  - **Qué:** función que recibe el `stepId` y restaura solo el slice correspondiente desde `snapshot`: `alumno` → `setAlumno`; `historial` → `setHistorial`; `academico` → `setAcademico`; `responsables` → `setResponsables`; `foto` → `setFoto(null)`; `pago` → `setTipoBeca`/`setMontoEspecial`. No tocar otros pasos ni el servidor.
  - **Verifica:** restaurar Académico no revierte Alumno ni Pago; restaurar Foto no elimina la foto del servidor.
  - **Depende de:** T16.

- [ ] **T18 — Renderizar "Restaurar" en cada ventana**
  - **Archivo(s):** `src/components/matricula/MatriculaWizard.tsx` (títulos `wizard-pane__title`, l.879, 973, 1239, 1439, 1703, 1713).
  - **Qué:** mostrar un botón `Restaurar` (`btn btn--ghost btn--sm`) junto al título de cada ventana solo cuando `edicion` existe, con `data-testid={\`matricula-restaurar-${stepId}\`}` para `alumno`, `historial`, `academico`, `responsables`, `foto` y `pago`. El paso Confirmar no lleva botón.
  - **Verifica:** en edición aparecen seis botones con los `data-testid` correctos; en creación no aparece ninguno.
  - **Depende de:** T17.

- [ ] **T19 — Conectar cada botón con su slice**
  - **Archivo(s):** `src/components/matricula/MatriculaWizard.tsx`.
  - **Qué:** cada botón llama a `restaurarPaso(stepId)`. No hay diálogo de confirmación (es estado local). Mantener el foco y el layout del título (sin degradados).
  - **Verifica:** modificar un campo de Académico y Pago y pulsar `matricula-restaurar-academico`/`matricula-restaurar-pago` devuelve cada ventana a su valor inicial.
  - **Depende de:** T18.

- [ ] **T20 — Footer en modo edición**
  - **Archivo(s):** `src/components/matricula/MatriculaWizard.tsx` (footer, l.787-847).
  - **Qué:** en edición, el botón final dice "Guardar cambios" (no "Confirmar y guardar"); mantener Atrás/Siguiente y el estado `saveMut.isPending`. No mostrar la generación de credenciales/ZIP.
  - **Verifica:** el footer cambia según `edicion`; en creación se mantiene el texto actual.
  - **Depende de:** T10.

## Fase 6: Frontend UI — guardado en edición

- [ ] **T21 — Rama de edición en `saveMut`**
  - **Archivo(s):** `src/components/matricula/MatriculaWizard.tsx` (`saveMut`, l.549-756).
  - **Qué:** agregar `if (edicion) { ... return }` al inicio de la mutación, con la secuencia de guardado descrita en T22-T27. La rama de creación queda intacta.
  - **Verifica:** en creación se ejecuta el flujo actual; en edición no se llama `createUser`/`createAlumno` ni se genera ZIP.
  - **Depende de:** T10, T16.

- [ ] **T22 — Guardar perfil y datos del alumno con `updatePersona`**
  - **Archivo(s):** `src/components/matricula/MatriculaWizard.tsx`.
  - **Qué:** llamar `updatePersona(edicion.alumnoCode, {...})` con perfil + datos de alumno (procede_otra_institucion, nombre_institucion_origen, alergias, condiciones, grados_repetidos). Si se eligió una foto nueva, subirla antes con `upload(..., 'perfil_foto')` y enviar `path_imagen`. Si no hay foto nueva, no enviar `path_imagen`.
  - **Verifica:** los cambios de perfil/historial persisten; la foto existente no se borra; `pnpm exec tsc --noEmit`.
  - **Depende de:** T21.

- [ ] **T23 — Guardar la matrícula con `updateMatricula`**
  - **Archivo(s):** `src/components/matricula/MatriculaWizard.tsx`.
  - **Qué:** llamar `updateMatricula(edicion.matriculaId, { seccion_id, periodo_academico_id, es_reingreso, tipo_beca, monto_especial, cursos_retrasados })`. Enviar siempre `tipo_beca` (para que `normal` limpie la beca) y `monto_especial` solo si `tipo_beca === 'especial'`. Enviar `cursos_retrasados` con el arreglo reconstruido (`[]` para limpiar). Esto dispara el recálculo en backend.
  - **Verifica:** cambiar beca y grado y guardar devuelve 200; la tabla/resumen reflejan los cambios; "normal" quita la beca.
  - **Depende de:** T22, T02, T04.

- [ ] **T24 — Guardar responsables existentes**
  - **Archivo(s):** `src/components/matricula/MatriculaWizard.tsx` (paso responsables, l.1437-1699).
  - **Qué:** para cada tarjeta `existente` con `responsable_id`: `updatePersona(user_code, {...})` con los datos editados (teléfono, profesión, direcciones) y luego `linkResponsable(matriculaId, { responsable_id, parentesco, es_principal })` para reactualizar parentesco/principal (el backend reactiva el vínculo si estaba `INACTIVE`).
  - **Verifica:** editar el teléfono de un responsable y guardar actualiza la ficha; el vínculo conserva/actualiza parentesco y principal.
  - **Depende de:** T21, T13.

- [ ] **T25 — Crear y vincular responsables nuevos**
  - **Archivo(s):** `src/components/matricula/MatriculaWizard.tsx`.
  - **Qué:** para tarjetas en modo `nuevo`, reutilizar `createResponsable` + `linkResponsable` igual que en creación. Para tarjetas en modo `existente` sin `responsable_id`, resolverlo con `getResponsableByCode` antes de vincular.
  - **Verifica:** agregar un responsable nuevo en edición crea el usuario/responsable y lo vincula a la matrícula.
  - **Depende de:** T21.

- [ ] **T26 — Desvincular responsables retirados**
  - **Archivo(s):** `src/components/matricula/MatriculaWizard.tsx`.
  - **Qué:** comparar los responsables actuales contra `snapshot.responsables`; por cada tarjeta que estaba en el snapshot y ya no está, llamar `unlinkResponsable(matriculaId, responsable_id)`. No desvincular responsables que nunca se guardaron (nuevos sin persistir).
  - **Verifica:** quitar una tarjeta existente y guardar deja el vínculo `INACTIVE`; volver a agregarlo lo reactiva sin duplicar.
  - **Depende de:** T21, T05, T16.

- [ ] **T27 — Cierre y errores del guardado en edición**
  - **Archivo(s):** `src/components/matricula/MatriculaWizard.tsx`.
  - **Qué:** en éxito: toast, `onSaved()` (invalidar queries) y cerrar; no generar ZIP de credenciales. En error: mantener el wizard abierto, mostrar el mensaje con `apperr` y no cerrar ni perder los cambios locales. Respetar `confirmDisabled`/`isPending` para evitar doble envío.
  - **Verifica:** guardado exitoso cierra y refresca la tabla; un fallo deja el modal abierto con el error visible.
  - **Depende de:** T23-T26.

## Fase 7: Frontend UI — paso responsables en edición

- [ ] **T28 — Tarjetas `existente` con datos completos**
  - **Archivo(s):** `src/components/matricula/MatriculaWizard.tsx` (l.1437-1699).
  - **Qué:** en edición, la tarjeta `existente` muestra el nombre encontrado, el `user_code` y los campos editables (teléfono, profesión, dirección domicilio, dirección/teléfono de trabajo, parentesco, principal). Mantener el botón de buscar por código para reemplazar. Reutilizar `updateResp`.
  - **Verifica:** se pueden editar los datos del responsable desde el wizard y el estado se refleja en la tarjeta.
  - **Depende de:** T13.

- [ ] **T29 — Quitar tarjeta según su origen**
  - **Archivo(s):** `src/components/matricula/MatriculaWizard.tsx`.
  - **Qué:** al quitar una tarjeta en edición: si existe `responsable_id` (o estaba en el snapshot), retirarla del arreglo y marcarla para `unlinkResponsable` al guardar; si es nueva y nunca se guardó, solo retirarla del arreglo sin llamada al backend.
  - **Verifica:** quitar una tarjeta nueva no hace peticiones; quitar una existente programa el `unlink` (visible en la petición al guardar).
  - **Depende de:** T26, T28.

- [ ] **T30 — Reemplazar responsable por código**
  - **Archivo(s):** `src/components/matricula/MatriculaWizard.tsx` (`buscarResponsable`, l.760-778).
  - **Qué:** permitir buscar un `user_code` distinto con `getResponsableByCode`, cargar sus datos con `getFicha` y convertir la tarjeta en `existente` con el nuevo `responsable_id`. El anterior se retira y se desvincula al guardar (T26).
  - **Verifica:** reemplazar el responsable por otro código vincula al nuevo y desvincula al anterior.
  - **Depende de:** T28, T29.

- [ ] **T31 — Un solo responsable principal**
  - **Archivo(s):** `src/components/matricula/MatriculaWizard.tsx`.
  - **Qué:** mantener la regla actual de un único `es_principal` al marcar una tarjeta; al precargar, respetar el principal que venga de la ficha. Verificar que el guardado envía `es_principal` consistente por tarjeta.
  - **Verifica:** marcar otro principal desmarca el anterior; el vínculo guardado refleja un solo principal.
  - **Depende de:** T28.

## Fase 8: Integración en la página

- [ ] **T32 — Nuevo estado `editWizard` en `matricula.tsx`**
  - **Archivo(s):** `src/routes/_app/matricula.tsx` (estado `editRow`, l.51).
  - **Qué:** agregar `const [editWizard, setEditWizard] = useState<Matricula | null>(null)` (o `{ matriculaId, alumnoCode }`). Mantener `editRow` solo si otra parte lo usa; si no, retirarlo.
  - **Verifica:** `pnpm exec tsc --noEmit`.
  - **Depende de:** T01.

- [ ] **T33 — Abrir el wizard desde clic derecho y doble clic**
  - **Archivo(s):** `src/routes/_app/matricula.tsx` (doble clic l.188-190; ítem `ctx-editar` l.217-224).
  - **Qué:** ambos gestos fijan `editWizard` con la matrícula seleccionada en lugar de `editRow`. Mantener el resto de acciones del menú contextual (Ver, Eliminar, Reingreso) sin cambios.
  - **Verifica:** clic derecho → Editar y doble clic abren el wizard en modo edición con la fila correcta.
  - **Depende de:** T32.

- [ ] **T34 — Renderizar `MatriculaWizard` en edición**
  - **Archivo(s):** `src/routes/_app/matricula.tsx`.
  - **Qué:** renderizar `<MatriculaWizard edicion={{ matriculaId: editWizard.id, alumnoCode: editWizard.alumno_code }} open onClose={() => setEditWizard(null)} onCreated={...} periodos secciones grados modalidades cursos />` cuando `editWizard?.alumno_code` exista. En `onCreated`/`onSaved`, invalidar `matriculas`, `alumnos`, `consejeria-alumnos` y `persona-ficha` del alumno.
  - **Verifica:** el wizard abre con los catálogos y al guardar la tabla se refresca.
  - **Depende de:** T33, T27.

- [ ] **T35 — Retirar `PersonaEditModal` de matrícula**
  - **Archivo(s):** `src/routes/_app/matricula.tsx` (import l.7; bloque l.367-384).
  - **Qué:** eliminar el import y el render de `PersonaEditModal` en esta página. `PersonaEditModal` sigue existiendo para otras páginas. `UserFichaModal` (Ver) y "Eliminar" no cambian.
  - **Verifica:** no quedan referencias a `PersonaEditModal` en `matricula.tsx`; "Ver" y "Eliminar" siguen funcionando.
  - **Depende de:** T34.

- [ ] **T36 — Verificar flujos no editados de la página**
  - **Archivo(s):** `src/routes/_app/matricula.tsx`.
  - **Qué:** comprobar creación, reingreso, "Ver" ficha, "Eliminar" y exportación siguen intactos; el menú contextual no pierde opciones.
  - **Verifica:** recorrido manual de la página; `pnpm exec tsc --noEmit`.
  - **Depende de:** T35.

## Fase 9: Tests unitarios y verificación de tipos

- [ ] **T37 — Typecheck del proyecto**
  - **Archivo(s):** todo `src/`.
  - **Qué:** ejecutar `pnpm exec tsc --noEmit` y corregir los errores de tipos introducidos por `edicion`, snapshot y servicios.
  - **Verifica:** sin errores.
  - **Depende de:** T01-T36.

- [ ] **T38 — Lint y formato de los archivos tocados**
  - **Archivo(s):** `src/components/matricula/MatriculaWizard.tsx`, `src/routes/_app/matricula.tsx`, `src/services/matricula.ts`, `src/tests/e2e/matricula-edicion.spec.ts`.
  - **Qué:** ejecutar `pnpm exec eslint <archivos>` y `pnpm exec prettier --check <archivos>`; corregir avisos.
  - **Verifica:** ambos comandos sin errores.
  - **Depende de:** T37.

## Fase 10: Tests de integración / e2e (Playwright)

- [ ] **T39 — Nuevo spec: precarga en edición**
  - **Archivo(s):** `src/tests/e2e/matricula-edicion.spec.ts` (nuevo).
  - **Qué:** con `loginAs` (admin), ir a `/matricula`, clic derecho en la primera fila → `ctx-editar`; verificar que se abre el wizard en modo edición con el nombre del alumno, grado/sección y beca precargados (usar los `data-testid` existentes y los de Restaurar).
  - **Verifica:** `pnpm exec playwright test src/tests/e2e/matricula-edicion.spec.ts`.
  - **Depende de:** T34.

- [ ] **T40 — e2e: "Restaurar" por ventana**
  - **Archivo(s):** `src/tests/e2e/matricula-edicion.spec.ts`.
  - **Qué:** modificar un campo de Académico y de Pago; pulsar `matricula-restaurar-academico` y `matricula-restaurar-pago`; verificar que cada ventana vuelve al valor inicial y que la otra no cambia.
  - **Verifica:** el test pasa.
  - **Depende de:** T19.

- [ ] **T41 — e2e: editar responsable existente**
  - **Archivo(s):** `src/tests/e2e/matricula-edicion.spec.ts`.
  - **Qué:** en el paso Responsables, cambiar el teléfono de una tarjeta existente, guardar y verificar que se refleja (y que la petición de `updatePersona`/`linkResponsable` se envía).
  - **Verifica:** el test pasa.
  - **Depende de:** T24.

- [ ] **T42 — e2e: reemplazar responsable por código**
  - **Archivo(s):** `src/tests/e2e/matricula-edicion.spec.ts`.
  - **Qué:** buscar un `user_code` distinto con `getResponsableByCode`, confirmar el nuevo vínculo y que el anterior se desvincula al guardar.
  - **Verifica:** el test pasa.
  - **Depende de:** T30, T26.

- [ ] **T43 — e2e: desvincular responsable**
  - **Archivo(s):** `src/tests/e2e/matricula-edicion.spec.ts`.
  - **Qué:** quitar una tarjeta de responsable y verificar que se dispara `unlinkResponsable` (interceptar la petición `DELETE`) y que la tarjeta desaparece.
  - **Verifica:** el test pasa.
  - **Depende de:** T29.

- [ ] **T44 — e2e: cambio de beca y grado**
  - **Archivo(s):** `src/tests/e2e/matricula-edicion.spec.ts`.
  - **Qué:** cambiar a media beca y a otro grado, guardar; verificar que el resumen (`beca-resumen`) y la tabla reflejan los cambios. El recálculo en backend no se inspecciona desde el e2e, solo el efecto en pantalla.
  - **Verifica:** el test pasa.
  - **Depende de:** T23, T34.

- [ ] **T45 — Actualizar `matricula-wizard.spec.ts:105-120`**
  - **Archivo(s):** `src/tests/e2e/matricula-wizard.spec.ts` (test "admin edita una matrícula desde el clic derecho").
  - **Qué:** reemplazar las expectativas de `Editar alumno` y `matricula-edit-seccion` de `PersonaEditModal` por las del wizard en edición (por ejemplo, heading del wizard en modo edición y presencia de `matricula-restaurar-*`). Ajustar el cierre del modal si el botón cambió.
  - **Verifica:** `pnpm exec playwright test src/tests/e2e/matricula-wizard.spec.ts`.
  - **Depende de:** T35.

- [ ] **T46 — Regresión e2e del wizard de creación**
  - **Archivo(s):** `src/tests/e2e/matricula-wizard.spec.ts`.
  - **Qué:** ejecutar el spec completo para confirmar que la creación, la beca inline y el resumen no se rompieron con la rama de edición.
  - **Verifica:** el spec completo pasa.
  - **Depende de:** T45.

## Fase 11: Documentación

- [ ] **T47 — Actualizar el MAPA del frontend**
  - **Archivo(s):** `sasha_fronted/documentacion/MAPA.md`.
  - **Qué:** documentar el modo edición de `MatriculaWizard` (prop `edicion`, precarga al 100%, snapshot y "Restaurar" por ventana con `data-testid`), el reemplazo de `PersonaEditModal` por el wizard en `matricula.tsx`, los servicios `getMatricula`/`unlinkResponsable` y el consumo de `DELETE /matricula/{id}/responsables/{responsable_id}`. Indicar que no hay migración.
  - **Verifica:** el MAPA describe el flujo real; la actualización se acuerda con el usuario antes de incluirla en el cierre.
  - **Depende de:** T35, T46.

## Fase 12: Verificación final

- [ ] **T48 — Compilación y tipos**
  - **Archivo(s):** todo `sasha_fronted/`.
  - **Qué:** ejecutar `pnpm exec tsc --noEmit` y `pnpm build`; resolver errores de rutas/types.
  - **Verifica:** ambos comandos terminan sin errores.

- [ ] **T49 — Suite e2e de matrícula**
  - **Archivo(s):** `src/tests/e2e/matricula-edicion.spec.ts`, `src/tests/e2e/matricula-wizard.spec.ts`.
  - **Qué:** ejecutar los dos specs contra el backend con el fixture cargado.
  - **Verifica:** ver la sección **Verificación final** con los comandos exactos; todos en verde.

---

## Dependencias entre tareas

- T01 → T02 → T03.
- T04 depende de T01; T05 no depende de nada; T06 no depende de nada.
- T07 depende de T10-T13; T08 de T12; T09 de T15.
- T10 de T03; T11 de T10; T12 de T11; T13 de T11; T14 de T13; T15 de T10-T14.
- T16 de T15; T17 de T16; T18 de T17; T19 de T18; T20 de T10.
- T21 de T10 y T16; T22 de T21; T23 de T22, T02 y T04; T24 de T21 y T13; T25 de T21; T26 de T21, T05 y T16; T27 de T23-T26.
- T28 de T13; T29 de T26 y T28; T30 de T28 y T29; T31 de T28.
- T32 de T01; T33 de T32; T34 de T33 y T27; T35 de T34; T36 de T35.
- T37 de T01-T36; T38 de T37.
- T39 de T34; T40 de T19; T41 de T24; T42 de T30 y T26; T43 de T29; T44 de T23 y T34; T45 de T35; T46 de T45.
- T47 de T35 y T46; T48-T49 al final.

## Verificación final

Ejecutar en `sasha_fronted/`:

```bash
pnpm exec tsc --noEmit
pnpm exec eslint src/components/matricula/MatriculaWizard.tsx src/routes/_app/matricula.tsx src/services/matricula.ts src/tests/e2e/matricula-edicion.spec.ts
pnpm exec prettier --check src/components/matricula/MatriculaWizard.tsx src/routes/_app/matricula.tsx src/services/matricula.ts src/tests/e2e/matricula-edicion.spec.ts src/tests/e2e/matricula-wizard.spec.ts
pnpm generate-routes
pnpm build
pnpm exec playwright test src/tests/e2e/matricula-edicion.spec.ts
pnpm exec playwright test src/tests/e2e/matricula-wizard.spec.ts
```

Criterios de cierre:

- `tsc --noEmit` y `pnpm build` sin errores.
- `matricula-edicion.spec.ts` pasa completo (precarga, Restaurar, responsables, beca/grado, unlink).
- `matricula-wizard.spec.ts` pasa completo (creación sin regresiones y edición con el wizard).
- El wizard de creación sigue funcionando sin la prop `edicion`.
- MAPA del frontend actualizado.
- Sin migraciones nuevas.
