# Tareas: Bajas, visibilidad y restauración — Frontend

> Spec `022-bajas-visibilidad-restauracion`. Marcar `- [x]` al completar y verificar.
> Orden: 1 → 2 → 3 → 4 → 5 → 6.

## 1. Base
- [x] 1.1 Crear helper `puedeVerInactivos(roles)` (admin, admin_temporal, developer).
- [x] 1.2 Extender `DataTable` con `rowClassName` y `rowDataInactivo` (escritorio + cards).
- [x] 1.3 Agregar estilos `.fila-baja` y `.badge--baja` en `style1.css` (sin degradados).
- [x] 1.4 Crear componente/badge reutilizable «Dado de baja».

## 2. Servicios y tipos
- [x] 2.1 `users.ts`: `listUsers({incluirInactivos})`, `restaurarPersona`, `darDeBajaPersona`.
- [x] 2.2 `personas.ts`: `restaurarPersona`, `darDeBajaPersona`.
- [x] 2.3 `consejeria.ts`: `listAlumnosConsejeria({incluirInactivos})`, `listMaestrosConsejeria({incluirInactivos})`.
- [x] 2.4 `matricula.ts`: `listMatriculas({incluirInactivos})`.
- [x] 2.5 Tipos: `dado_de_baja` y `alumno_status`.

## 3. Usuarios
- [x] 3.1 Query con `incluirInactivos` según rol.
- [x] 3.2 Fila atenuada + badge «Dado de baja».
- [x] 3.3 Menú contextual: Ver; Editar solo activo; Eliminar si sin vínculos; Dar de baja si con vínculos; Restaurar si inactivo.
- [x] 3.4 Confirmaciones de baja/restauración con texto claro.
- [x] 3.5 Invalidar queries tras baja/restauración.

## 4. Consejería
- [x] 4.1 Alumnos: query con `incluirInactivos`, fila atenuada, badge y menú (Editar/Eliminar/Dar de baja/Restaurar).
- [x] 4.2 Maestros: mismo patrón.
- [x] 4.3 Invalidar `consejeria-alumnos`, `consejeria-maestros`, `matriculas`, `users`.

## 5. Matrícula
- [x] 5.1 Query con `incluirInactivos` según rol.
- [x] 5.2 Fila atenuada + badge «Dado de baja».
- [x] 5.3 Menú: Ver; Editar solo activo; Eliminar si sin vínculos; Dar de baja si con vínculos; Restaurar si inactivo.
- [x] 5.4 No abrir el wizard para inactivos.
- [x] 5.5 Invalidar queries tras baja/restauración.

## 6. Comboboxes y verificación
- [x] 6.1 Revisar que ningún combobox pase `incluirInactivos`.
- [x] 6.2 Verificar asignación/horarios (maestros), matrícula (responsables), disciplina/excusas (alumnos por código).
- [x] 6.3 `tsc --noEmit`.
- [x] 6.4 `eslint`.
- [x] 6.5 `build`.
- [x] 6.6 E2E nuevo `bajas-restauracion.spec.ts` (6 casos del plan).
- [x] 6.7 Regresión de e2e de usuarios, matrícula y consejería.
- [x] 6.8 Reportar PASS/FAIL y comandos.
