# Plan — Horario de exámenes — Frontend

- **ID:** 028-horario-examenes
- **Capa:** frontend (`sasha_fronted`)
- **Contrato:** `backend_sasha/spec/020-horario-examenes`
- **Datos:** `db_sasha/spec/002-horario-examenes`
- **Estado:** planificado

## 1. Objetivo

Página nueva para crear y publicar horarios de exámenes, dos modos limpios para el maestro
(Semana y Ahora), reportes de alumnos y vista del horario de exámenes para padre y alumno.

## 2. Rutas y roles

| Ruta | Rol | Qué muestra |
|---|---|---|
| `/examenes` | admin, admin temporal, secretaría, consejería, dirección | Lista + wizard + tablero |
| `/consejeria/examenes` | coordinador (solo lectura con alcance) | Vista de solo lectura |
| `/maestro` | maestro | Toggle “Clases / Exámenes” |
| `/maestro/examenes` | maestro | Semana de exámenes (solo lo supervisado por defecto) |
| `/maestro/examenes/ahora` | maestro | Panel limpio: examen actual, morosos, pasar lista y reportar |
| `/maestro/reportes-examen` | maestro | Reportes de las materias que da |
| `/alumno/horario` | alumno | Durante fechas de examen, horario de exámenes |
| `/hijo/horario` | responsable | Durante fechas de examen, horario de exámenes |

## 3. Administración (`/examenes`)

### Lista
- `DataTable` estilo registros (REG-UI-12): periodo, parcial, modalidad, fechas, versión,
  estado y acciones.
- Buscador «Buscar…», filtros periodo/parcial/modalidad/estado, exportación.
- Acciones: Ver, Editar, Publicar, Activar/Desactivar, Eliminar (borrador).

### Wizard (4 pasos)
1. **Datos:** periodo, parcial, modalidad, fecha de inicio y fin.
2. **Bloques:** “¿Cuántos exámenes por día?” + filas con hora de inicio y fin; el receso es
   el hueco entre bloques. Mismo bloque para todos los días.
3. **Supervisores:** pregunta “¿Agregar supervisores?”. Si sí: elegir maestro y agregar
   uno o varios `grado-sección` con el botón +.
4. **Tablero:** filas = fechas (`01 L`, `02 M`), columnas = bloques.
   - Pastillas de `materia · grado · sección`.
   - Pastilla “solo materia”: al soltarla, llena todas las secciones de la modalidad que
     tengan esa materia.
   - Sin choque de maestro; una sección no admite dos exámenes en el mismo bloque.
   - Generar, limpiar y guardar.

### Acciones del tablero
- Arrastrar/soltar pastillas y bloques ya colocados.
- Filtros por grado, sección y materia.
- Botón **Generar** (preview) y **Guardar** (borrador).
- **Publicar** con confirmación; desactiva la versión anterior.
- Vista de solo lectura y exportación PDF.

## 4. Maestro

### Toggle “Clases / Exámenes”
- En `/maestro`, un `SegmentedToggle` cambia el modo.
- En modo Exámenes, la interfaz se simplifica: solo lo relacionado con exámenes.

### Semana de exámenes
- Por defecto, solo las secciones que supervisa.
- Botón **Ver todo** y filtros por grado/sección/fecha.
- Tarjetas o grilla por fecha y bloque; resalta lo suyo.

### Ahora
- Panel limpio con:
  - El examen del bloque actual de cada sección que supervisa (puede haber más de uno).
  - Materia, grado, sección y hora.
  - Lista de alumnos con pagos pendientes (informativa) en cards con foto, nombre, código,
    grado y sección.
  - Botón **Pasar lista** (A/T/E/F), una vez por examen y corregible.
  - Botón **Reportar alumno** (modal: código + detalle opcional).
- Si no hay examen ahora: mensaje y siguiente examen del día.

### Reportes
- Página `/maestro/reportes-examen`.
- Tabla: código, nombre, grado-sección, materia, fecha, supervisor y **Ver**.
- Filtros por grado, sección, materia, fecha y alumno.
- **Nuevo reporte** para cualquier maestro: elegir examen de sus materias, código de alumno
  y detalle opcional.
- Editar/eliminar solo los propios.

## 5. Portal (alumno y responsable)

- En `/alumno/horario` y `/hijo/horario`, si hay horario de exámenes publicado y la fecha
  actual cae en el rango, se muestra el horario de exámenes con el título
  **“Horario de exámenes”**.
- Se muestran fechas, bloques, materias y **hora de salida** del día.
- Si el alumno tiene pagos pendientes que bloquean notas, aparece un aviso informativo.
- En móvil, vista por días como el horario normal.

## 6. Diseño y UX

- Sin degradados (REG-UI-01).
- Buscador «Buscar…» (REG-UI-11).
- Registros con `DataTable` (REG-UI-12); tablero con rejilla tipo horario.
- Tokens de color existentes; el estado publicado usa el color de éxito.
- Responsive: tablero con scroll horizontal; paneles del maestro apilados; cards de alumno.
- El modo Exámenes del maestro debe ser más limpio que el modo Clases.

## 7. Archivos previstos

```
src/routes/_app/examenes.tsx
src/routes/_app/maestro/examenes.tsx
src/routes/_app/maestro/examenes.ahora.tsx
src/routes/_app/maestro/reportes-examen.tsx
src/components/examenes/
  ExamenBoard.tsx
  ExamenWizard.tsx
  ExamenViewModal.tsx
  ExamenSemanaPanel.tsx
  ExamenAhoraPanel.tsx
  ExamenAlumnoCard.tsx
  ReporteModal.tsx
  ReportesExamenTable.tsx
  ExamenHorarioView.tsx
src/services/examenes.ts
src/lib/examenes.ts
src/lib/examenesPdf.ts
```

## 8. Permisos y navegación

- `examenes:get/post/put/delete/asistencia/reportar` en `helpers/permissions.ts`.
- Menú “Horarios de examen” para roles con `examenes:get/post`.
- Menú “Reportes de examen” para maestros.
- Command palette con la ruta nueva.

## 9. Pruebas

- E2E admin: crear, tablero, generar, publicar, ver.
- E2E maestro: ahora, pasar lista, reportar, ver reportes.
- E2E portal: padre/alumno ven el horario de exámenes y el aviso de pagos.
- `tsc --noEmit`, `eslint` de archivos tocados y `pnpm build`.

## 10. Riesgos

- `/horarios` ya es una página sobrecargada; la de exámenes va aparte.
- El tablero de exámenes no debe reutilizar la validación de choque de maestro.
- La vista del portal debe cambiar sin romper el horario normal.
- El modo “Ahora” debe refrescar la hora y la lista sin recargar toda la página.
