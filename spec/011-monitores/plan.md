# Plan de Especificación: Monitores — Frontend

> Feature `011-monitores` · Frontend Sasha (React 19 + TanStack Start) · v1
> Capa: **frontend** (`sasha_fronted/`). Página de solo lectura para director, consejeria,
> admin y admin temporal: ver en vivo cada clase del bloque horario en curso.

---

## 1. Objetivo

- Ruta **`/monitores`** (visible con `monitores:get`).
- Cabecera: título **«Monitores»**, el **bloque horario actual** (p. ej. «07:00 – 07:40») y un **buscador**.
- **Una card por clase en curso**, pensada para tablet/teléfono:
  - Encabezado: **grado · sección**.
  - **Clase** (curso) y **maestro** que la imparte.
  - **Plan de la semana**: «N cosas» + **% de avance** (termómetro) y el estado de cada ítem.
  - Fila de **iconos con número** (táctiles):
    - **T** → tareas de hoy (cuántas).
    - **Asistencia** → si ya se pasó (✓/pendiente) + marcas/alumnos.
    - **Faltantes** → cuántos alumnos faltaron.
    - **Tarde** → cuántos llegaron tarde.
- **Cada icono abre un modal**:
  - Tareas → lista de tareas de hoy con `revisados/total`; al tocar una → `TareaRevisionModal` (quién entregó).
  - Faltantes → lista de alumnos con su nombre y tipo.
  - Tarde → lista de alumnos que llegaron tarde.
- Actualiza sola cada 60 s (como el tablero del maestro).

## 2. Permisos y menú
- `helpers/permissions.ts`: `monitores:get` para `admin`, `admin_temporal`, `director` y `consejeria`.
- `helpers/nav.ts`: ítem «Monitores` (icono `monitor`/`radar`).
- `components/layout/nav-icons.tsx`: registrar el icono.

## 3. Contrato con el backend
- `GET /monitor/?fecha=YYYY-MM-DD&hora=HH:MM` → `{ consulta, bloque, clases[] }` (ver spec backend `005`).
- Detalle por tarea: reusa `GET /tareas/revision/{id}` y `TareaRevisionModal`.

## 4. Archivos

| Archivo | Cambio |
|---|---|
| `src/services/monitores.ts` | `getMonitor({fecha,hora})` + tipos. |
| `src/routes/_app/monitores.tsx` | Página (cabecera + buscador + grid de cards). |
| `src/components/monitores/MonitorTareasModal.tsx` | Lista de tareas de hoy → abre `TareaRevisionModal`. |
| `src/components/monitores/MonitorAsistenciaModal.tsx` | Lista de faltantes / tardes. |
| `src/helpers/permissions.ts` | `monitores:get`. |
| `src/helpers/nav.ts` + `nav-icons.tsx` | Ítem e icono. |
| `src/tests/e2e/monitores.spec.ts` | e2e: abre la página, ve la cabecera y busca. |

## 5. UI
- Reusa estilos: tarjeta con tokens, termómetro tipo `mdash__plan-thermo`, fila de iconos con contador.
- Responsive: una columna en celular, dos en tablet, más en escritorio.
- Sin degradados; **buscador** con placeholder «Buscar…» (REG-UI-11).

## 6. Tests
- `pnpm generate-routes`, `tsc --noEmit`, `eslint`.
- e2e `monitores.spec.ts` (no ejecutable sin DB/backend; se documenta).
