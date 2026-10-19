# Plan: Adjuntos del portal (padre) y errores copiables - Frontend

## Problema (confirmado en produccion)

Con el rol `responsable` en `/hijo/tareas`, al pulsar **Ver** o **Descargar** un adjunto:

```
GET /api/portal/adjuntos/<id>/archivo -> 400 {"message":"alumno_id requerido","code":"BAD_REQUEST"}
```

El listado si manda `?alumno_id=` (`listTareasHijo`), pero el binario no:
`adjuntoPortalArchivoPath(adjuntoId)` construye la ruta sin query. El backend
(`internal/portal/handler.go:resolveAlumno`) exige `alumno_id` para `responsable`.
El maestro funciona porque usa el endpoint de staff, que no lo pide.

Ademas:
- La previsualizacion es diferida: hay que pulsar **Ver** (para imagenes debe ser automatica).
- Los errores no dan informacion util para reportar y no se pueden copiar.

## Alcance

1. **Propagar `alumnoId` al binario del portal.**
   - `src/services/portal.ts`:
     - `adjuntoPortalArchivoPath(adjuntoId, alumnoId?)` -> usa `alumnoQs`.
     - `descargarAdjuntoPortal(adjunto, alumnoId?)`.
   - `TareaPortalVerModal` recibe `alumnoId?: string | null` y lo pasa a `AdjuntoItem`.
   - `TareasLista` y `PortalTareasView` pasan su `alumnoId` al modal.
2. **Imagenes en linea.**
   - En `TareaPortalVerModal`, para `imagen` se monta `AdjuntoVista` al abrir la tarea
     (sin exigir "Ver"). Los **PDF siguen con "Ver"** (decision del usuario).
   - `Word/Excel` siguen solo descarga.
3. **Errores informativos y copiables.**
   - `src/lib/api.ts`:
     - `ApiError` gana `requestId?: string` y `path`/`method` si aportan.
     - `apiRequest` lee `X-Request-Id` de la respuesta y lo guarda en el `ApiError`.
     - Nuevo helper `errorReportText(err, ctx?)` que arma un texto legible con:
       fecha, metodo, URL, status, code, message, request_id y (si existe) el body.
     - Nuevo helper `copyErrorReport(err)` (o componente) que copia al portapapeles.
   - Toast de error: mostrar `userMessageFromError(e)` y una accion **Copiar** con
     `toast.error(msg, { action: { label: 'Copiar', onClick: ... } })`.
   - `AdjuntoVista` / `use-archivo-autenticado`: exponer el error real (no descartarlo)
     y mostrar "No se pudo cargar el archivo" + boton **Copiar detalle** + Reintentar.
   - Mensajes: en espanol, sin SQL crudo; el detalle tecnico va al portapapeles.

## Contrato con backend

- Cabecera `X-Request-Id` en toda respuesta.
- JSON de error: `{ message, code, status, request_id? }`.
- El frontend no debe romper si `request_id` no viene (retrocompatible).

## Archivos previstos

- `src/services/portal.ts`
- `src/components/portal/TareaPortalVerModal.tsx`
- `src/components/portal/TareasLista.tsx`
- `src/components/portal/PortalTareasView.tsx`
- `src/components/archivos/AdjuntoVista.tsx`
- `src/hooks/use-archivo-autenticado.ts`
- `src/lib/api.ts`
- (nuevo, si aplica) `src/lib/error-report.ts` o `src/components/ui/CopyButton.tsx`
- `src/tests/e2e/adjuntos-tarea.spec.ts`

## Criterios de aceptacion

- Como padre (`1002026901`) se ven las imagenes al abrir la tarea, sin pulsar "Ver".
- Descargar imagen/PDF funciona (200) y conserva el nombre original.
- Como alumno (`1002026701`) sigue funcionando.
- El PDF sigue requiriendo "Ver".
- Un error muestra mensaje claro y el boton Copiar copia status/code/request_id.
- `tsc --noEmit`, `eslint`, `build` y e2e de adjuntos en verde.

## Fuera de alcance

- Backend (va en `backend_sasha/spec/013-...`).
- Cambios de esquema.
