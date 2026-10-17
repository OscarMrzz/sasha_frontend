# Plan de Especificación: Adjuntos de tarea (documentos/fotos) + visor con zoom

> Feature `017-adjuntos-tarea` · Frontend Sasha · v1
> Capa: **frontend** (`sasha_fronted/`). Consume el contrato ya implementado en el backend
> (`backend_sasha/spec/009-adjuntos-tarea`). No toca el backend.

---

## 1. Problema y objetivo

- **Problema.** El maestro no puede adjuntar documentos o fotos a una tarea, y el alumno o el
  responsable no pueden ver ni descargar los archivos de una tarea. Tampoco existe un visor de
  imágenes que permita ver una foto en grande y con zoom desde el teléfono.
- **Objetivo v1.**
  1. El maestro (o cualquier rol con `tareas:put`) sube archivos a una tarea desde el detalle
     (imagen, PDF, Word o Excel), ve la lista con ícono y peso, previsualiza imagen/PDF, descarga
     y borra. Respeta el máximo de archivos por tarea.
  2. El alumno y el responsable ven la sección **Archivos** de cada tarea, previsualizan imagen/PDF
     inline y descargan siempre. Al tocar una imagen, se abre en grande con zoom y arrastre.
  3. El administrador configura por periodo el máximo de archivos por tarea y el peso máximo por
     archivo.
- **Fuera de alcance.** Cambios de backend; reemplazo de un adjunto (solo subir/borrar); edición de
  archivos ya subidos; subida múltiple simultánea; antivirus o cuotas por institución.

### 1.1 Contrato backend (ya implementado, se usa tal cual)

- **Staff** (`permiso`): `POST /tareas/{id}/adjuntos` (multipart `file`, `tareas:put`),
  `GET /tareas/{id}/adjuntos` (`tareas:get`), `DELETE /tareas/{id}/adjuntos/{adjuntoId}`
  (`tareas:put`), `GET /tareas/{id}/adjuntos/{adjuntoId}/archivo` (stream, `tareas:get`).
- **Portal**: `TareaClase` incluye `adjuntos[]`; `GET /portal/adjuntos/{adjuntoId}/archivo` (stream).
- **Adjunto** serializado: `id`, `nombre_original`, `content_type`, `size_bytes`
  (`tarea_id`, `expira_at`, `created_at` también vienen en staff).
- **Límites del periodo**: `max_archivos_tarea` (por defecto 3) y `max_peso_archivo_mb`
  (por defecto 20), expuestos en el GET/POST/PUT del periodo.
- **Tipos**: imágenes (`image/*`) y PDF se previsualizan (`inline`); Word/Excel solo se descargan
  (`attachment`). Siempre se puede descargar.
- **Errores de validación** del backend (400): tipo no permitido, peso excedido, cantidad excedida.

---

## 2. Diseño

### 2.1 Helpers puros (`src/helpers/adjuntos.ts`)

Constantes `MAX_ADJUNTOS_TAREA_DEFAULT = 3`, `MAX_PESO_ARCHIVO_MB_DEFAULT = 20` y funciones sin
estado reutilizadas por staff y portal:

- `categoriaAdjunto(contentType)` → `imagen | pdf | word | excel | otro`.
- `esImagenAdjunto(contentType)` / `previsualizaAdjunto(contentType)` (imagen o PDF).
- `etiquetaCategoria(cat)` (para el subtítulo del archivo).
- `formatoPeso(bytes)` → «1.2 MB», «320 KB».
- `validarAdjunto(file, maxMB)` → mensaje de error o `null` (vacío, peso, tipo/extensión).

### 2.2 Servicios

- `src/services/tareas.ts`: tipo `TareaAdjunto` y `listAdjuntos`, `subirAdjunto` (multipart),
  `deleteAdjunto`, `adjuntoArchivoPath`, `descargarAdjunto`.
- `src/services/portal.ts`: tipo `PortalAdjunto`, `PortalTarea.adjuntos`,
  `adjuntoPortalArchivoPath`, `descargarAdjuntoPortal`.
- `src/services/catalogos.ts`: `max_archivos_tarea` / `max_peso_archivo_mb` en `Periodo` y
  `PeriodoCreate`.
- `src/lib/descargas.ts`: `descargarArchivo(path, nombre)` (fetch autenticado `raw` → Blob → `a`).

### 2.3 Hook de lectura autenticada (`src/hooks/use-archivo-autenticado.ts`)

Carga un binario con sesión + rol (`X-Active-Role`) como object URL, con `AbortController` y
limpieza del object URL. Patrón de `use-boveda-image`, parametrizado por ruta (staff o portal).

### 2.4 Configuración del periodo (`routes/_app/catalogos/periodos.tsx`)

Dos campos en el formulario (mismo `fieldset` de reglas, `disabled` en modo ver): **Archivos por
tarea** (`data-testid="periodo-max-archivos"`) y **Peso máximo por archivo (MB)**
(`data-testid="periodo-max-peso"`). Solo los edita quien tiene `catalogos:put` (admin / admin
temporal); el resto solo ve.

### 2.5 Maestro (staff)

- `src/components/tareas/AdjuntoPicker.tsx`: botones **Cargar archivo** y **Añadir archivo** que
  despliega **Tomar fotografía** / **Elegir archivo**, con cámara (`getUserMedia`) en escritorio y
  `<input accept="image/*" capture="environment">` en celular (patrón de `SubirReciboModal`).
  Valida tipo y peso antes de aceptar el `File`.
- `src/components/tareas/AdjuntosTarea.tsx`: sección **Archivos (n/máximo)** con lista amigable
  (ícono según tipo + nombre + peso), previsualización inline (imagen o PDF), **Descargar** por
  archivo y **Eliminar** (con confirmación). Muestra/oculta la subida según `tareas:put` y
  deshabilita al llegar al tope.
- `TareaVerModal`: añade la sección **Archivos** (`<AdjuntosTarea>`).
- `TareaCreateModal`: deja elegir archivos pendientes al crear; al guardar la tarea los sube y
  reporta cuántos entraron y cuántos fallaron. En edición muestra la sección editable.

### 2.6 Portal (alumno / responsable)

- `src/components/archivos/AdjuntoVista.tsx` (compartido): imagen inline o PDF en `iframe`.
- `TareaPortalVerModal`: sección **Archivos (N)** con tarjetas (ícono + título + peso + Descargar),
  imagen/PDF inline. Tocar una imagen abre `VisorImagen`.
- `src/components/portal/VisorImagen.tsx`: modal a pantalla completa con **zoom/pinch** y
  **arrastre**, y botones acercar / alejar / cerrar. `data-testid`: `visor-imagen`, `visor-cerrar`,
  `visor-zoom-in`, `visor-zoom-out` (más `data-scale` para las pruebas).

### 2.7 Estilos (`src/styles/style1.css`)

Bloques nuevos (colores sólidos de los tokens, sin degradados): `.adjunto-item*`, `.adjunto-vista*`
y `.visor-imagen*`.

---

## 3. Archivos

| Archivo | Cambio |
|---|---|
| `src/helpers/adjuntos.ts` | Nuevo: categorías, pesos y validación de adjuntos. |
| `src/lib/descargas.ts` | Nuevo: descarga autenticada a blob. |
| `src/hooks/use-archivo-autenticado.ts` | Nuevo: binario autenticado → object URL. |
| `src/services/tareas.ts` | `TareaAdjunto` + CRUD y descarga de adjuntos. |
| `src/services/portal.ts` | `PortalAdjunto`, `PortalTarea.adjuntos` y descarga portal. |
| `src/services/catalogos.ts` | Límites de adjuntos en `Periodo`/`PeriodoCreate`. |
| `src/routes/_app/catalogos/periodos.tsx` | Dos campos nuevos. |
| `src/components/tareas/AdjuntoPicker.tsx` | Nuevo: cámara/archivo. |
| `src/components/tareas/AdjuntosTarea.tsx` | Nuevo: sección Archivos staff. |
| `src/components/tareas/TareaVerModal.tsx` | Sección Archivos. |
| `src/components/tareas/TareaCreateModal.tsx` | Archivos al crear / editar. |
| `src/components/archivos/AdjuntoVista.tsx` | Nuevo: previsualización compartida. |
| `src/components/archivos/AdjuntoIcono.tsx` | Nuevo: ícono por tipo. |
| `src/components/portal/TareaPortalVerModal.tsx` | Sección Archivos + visor. |
| `src/components/portal/VisorImagen.tsx` | Nuevo: visor con zoom/pan. |
| `src/styles/style1.css` | Estilos nuevos. |
| `src/tests/e2e/adjuntos-tarea.spec.ts` | Nuevo: subir imagen/PDF, borrar, cámara. |
| `src/tests/e2e/portal.spec.ts` | Caso: sección Archivos + visor con zoom. |

---

## 4. Tests / verificación

- `pnpm exec tsc --noEmit`.
- `pnpm exec eslint <archivos>`.
- `pnpm build`.
- `pnpm exec playwright test src/tests/e2e/adjuntos-tarea.spec.ts src/tests/e2e/portal.spec.ts`.
- Los e2e de subida requieren MinIO disponible (bucket `sasha-docs-test`); si no lo está, se
  documenta el fallo.

## 5. Fuera de alcance

- Backend y su contrato (ya implementado).
- Migración de base de datos (la aporta el backend con `062_tarea_adjunto.sql`).
- Reemplazo/edición de un adjunto existente y notificaciones al subir/borrar.
