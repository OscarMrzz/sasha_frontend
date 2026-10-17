# Tareas — 017 Adjuntos de tarea (documentos/fotos) + visor con zoom

> Capa: **frontend** (`sasha_fronted/`). Orden de ejecución de arriba a abajo.

## Fase 1 — Base y servicios

- [x] `src/helpers/adjuntos.ts`: categorías, etiqueta, peso y `validarAdjunto`.
- [x] `src/lib/descargas.ts`: descarga autenticada a blob.
- [x] `src/hooks/use-archivo-autenticado.ts`: binario autenticado → object URL.
- [x] `src/services/tareas.ts`: `TareaAdjunto`, `listAdjuntos`, `subirAdjunto`, `deleteAdjunto`,
      `adjuntoArchivoPath`, `descargarAdjunto`.
- [x] `src/services/portal.ts`: `PortalAdjunto`, `PortalTarea.adjuntos`, `adjuntoPortalArchivoPath`,
      `descargarAdjuntoPortal`.
- [x] `src/services/catalogos.ts`: `max_archivos_tarea` / `max_peso_archivo_mb`.

## Fase 2 — Configuración del periodo

- [x] `routes/_app/catalogos/periodos.tsx`: campos `periodo-max-archivos` y `periodo-max-peso`
      (crear/editar/ver).

## Fase 3 — Maestro (staff)

- [x] `src/components/archivos/AdjuntoIcono.tsx`.
- [x] `src/components/archivos/AdjuntoVista.tsx`.
- [x] `src/components/tareas/AdjuntoPicker.tsx` (cargar / añadir / tomar fotografía / elegir archivo).
- [x] `src/components/tareas/AdjuntosTarea.tsx` (lista, preview, descargar, borrar, tope).
- [x] `TareaVerModal.tsx`: sección Archivos.
- [x] `TareaCreateModal.tsx`: archivos pendientes al crear y sección editable al editar.

## Fase 4 — Portal y visor

- [x] `src/components/portal/VisorImagen.tsx` (zoom/pinch, arrastre, botones).
- [x] `TareaPortalVerModal.tsx`: sección Archivos (N) + visor de imágenes.

## Fase 5 — Estilos

- [x] `src/styles/style1.css`: `.adjunto-item*`, `.adjunto-vista*`, `.visor-imagen*` (sin degradados).

## Fase 6 — Tests e2e

- [x] `src/tests/e2e/adjuntos-tarea.spec.ts`: subir imagen, subir PDF, borrar, cámara (fake device).
- [x] `src/tests/e2e/portal.spec.ts`: alumno ve Archivos, descarga y abre el visor con zoom.

## Fase 7 — Verificación

- [x] `pnpm exec tsc --noEmit` sin errores.
- [x] `pnpm exec eslint` sin errores en los archivos nuevos/modificados.
- [x] `pnpm build` OK.
- [x] `pnpm exec playwright test` de `adjuntos-tarea.spec.ts` (2/2) y del caso de Archivos en `portal.spec.ts` (1/1), con MinIO arriba.
- [ ] Preguntar si se actualiza `documentacion/MAPA.md`.
