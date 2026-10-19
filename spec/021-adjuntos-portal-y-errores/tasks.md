# Tareas: Adjuntos del portal (padre) y errores copiables - Frontend

## TAR-1 `alumno_id` en el binario

- [x] `src/services/portal.ts`: `adjuntoPortalArchivoPath(adjuntoId, alumnoId?)` con `alumnoQs`.
- [x] `descargarAdjuntoPortal(adjunto, alumnoId?)`.
- [x] `TareaPortalVerModal` recibe `alumnoId` y lo pasa a `AdjuntoItem` (path y descarga).
- [x] `TareasLista` pasa `alumnoId` al modal.
- [x] `PortalTareasView` pasa `alumnoId` al modal.

## TAR-2 Imagenes en linea (PDF sigue con Ver)

- [x] En `AdjuntoItem`, las imagenes montan `AdjuntoVista` automaticamente.
- [x] Los PDF conservan el boton Ver/Ocultar.
- [x] Word/Excel solo descarga.

## TAR-3 Errores copiables

- [x] `src/lib/api.ts`: `ApiError.requestId` + lectura de `X-Request-Id` / `request_id`.
- [x] Helper `errorReportText(err, ctx?)` (fecha, metodo, URL, status, code, message, request_id, body).
- [x] Helper `copyText` / `copyErrorReport` con toast.
- [x] `toastApiError` con accion **Copiar**.
- [x] `use-archivo-autenticado` expone el error; `AdjuntoVista` muestra detalle + Copiar.

## TAR-4 Tests y verificacion

- [x] `adjuntos-tarea.spec.ts`: el **padre** ve la imagen en linea y descarga; PDF sigue con Ver.
- [x] `npx tsc --noEmit` PASS, `pnpm run build` PASS.
- [x] ESLint acotado a los archivos tocados PASS (`pnpm run lint` completo tiene baseline previo de 328 problemas).
- [x] e2e `adjuntos-tarea` 5/5 PASS; `portal.spec.ts` 8/8 PASS; `portal-padre.spec.ts` 13/14 (fallo preexistente por fecha "Debe 2 meses").
