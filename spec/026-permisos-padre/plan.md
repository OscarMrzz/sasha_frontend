# Plan: Permisos de ausencia del padre — Frontend

> Feature `026-permisos-padre` · React 19 + TanStack Start.
> Contrato: `backend_sasha/spec/018-permisos-padre/plan.md`.
> Solo web en esta entrega.

## Lo que verá el padre

- Nuevo botón **Permisos** en el inicio del hijo (junto a Tareas, Pagos, Horario…).
- Página `/hijo/permisos`:
  - Botón **Solicitar permiso**.
  - Lista desplegable de **faltas y tardanzas** con botón **Justificar** (abre el wizard con esa fecha).
  - Lista de **mis solicitudes** con estado y opción de cancelar pendientes.
- Wizard de 4 pasos:
  1. Fechas (desde / hasta, sin límite).
  2. Motivos (botones, varios).
  3. Detalle + adjunto opcional.
  4. Resumen y enviar.

## Lo que verá el staff

- Página `/permisos` (consejería, coordinación, admin y admin temporal):
  - Bandeja de solicitudes con filtro por estado.
  - Detalle con motivos, texto y adjunto.
  - Aprobar (crea la excusa) o rechazar (motivo obligatorio).
- Página `/permisos/tipos` (admin y admin temporal): crear/editar motivos.

## Archivos

- `src/services/permisos.ts` y `src/helpers/permisos.ts`.
- `src/components/permisos/PermisoWizard.tsx`.
- `src/routes/_app/hijo/permisos.tsx`.
- `src/routes/_app/permisos/index.tsx` y `tipos.tsx`.
- `HijoHub.tsx`, `nav.ts`, `nav-icons.tsx`, `permissions.ts`, `command-palette.ts`.
- `src/styles/style1.css`.
- E2E `src/tests/e2e/permisos-padre.spec.ts`.

## Reglas

- Sin degradados; tokens `--sasha-*`.
- El padre solo ve a sus hijos (el backend lo valida).
- El staff solo aprueba/rechaza; no crea permisos por el padre.
- El adjunto no es obligatorio.

## Pruebas

- E2E: padre envía una solicitud; consejería la ve, aprueba y el estado cambia; rechazo con motivo; permisos por rol.
- `tsc`, `eslint` de archivos tocados y `pnpm build`.
