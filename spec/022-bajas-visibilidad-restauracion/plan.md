# Plan de Especificación: Bajas, visibilidad y restauración — Frontend

> Feature `022-bajas-visibilidad-restauracion` · Frontend Sasha (React 19 + TanStack) · v1
> Capa: **frontend** (`sasha_fronted/`).
> Espejo de `backend_sasha/spec/014-bajas-visibilidad-restauracion/plan.md`.
> Reglas: sin degradados; tokens de color; buscador «Buscar…»; `DataTable` para registros; permisos con `Can`/`useCan`.
>
> **Objetivo:** que los inactivos aparezcan **solo** en Usuarios, Alumnos, Maestros y Matrículas, y solo para
> `admin`, `admin_temporal` y `developer`, con fila atenuada, etiqueta «Dado de baja» y acción **Restaurar**.
> En el resto de pantallas y comboboxes: solo activos.

---

## 1. Reglas de visibilidad

- Helper `puedeVerInactivos(roles: readonly string[]): boolean` en `src/helpers/roles.ts` o `src/lib/roles.ts`:
  - `admin`, `admin_temporal`, `developer` (case-insensitive).
- Si el rol no está autorizado:
  - No se envía `incluir_inactivos`.
  - El backend devuelve solo activos.
- Si está autorizado:
  - Las 4 pantallas envían `incluir_inactivos=true`.
  - Se muestran activos e inactivos juntos; los inactivos atenuados.

---

## 2. Cambios transversales

### 2.1 `DataTable`
- Nueva prop opcional `rowClassName?: (row: T) => string`.
- Aplicarla al `<tr>` de escritorio y al `<li>` de cards.
- Nueva prop opcional `rowDataInactivo?: (row: T) => boolean` para añadir `data-inactivo="true"` (tests).
- No cambia el comportamiento actual si no se pasan.

### 2.2 Estilos
- En `style1.css`:
  ```css
  .data-table tr.fila-baja,
  .data-card.fila-baja { opacity: .55; }
  .data-table tr.fila-baja .badge,
  .data-card.fila-baja .badge { opacity: 1; }
  .badge--baja { /* color sólido de tokens, sin degradado */ }
  ```
- Etiqueta «Dado de baja» con `badge badge--baja`.
- La fila sigue siendo legible; no se oculta el texto.

### 2.3 Badge de estado
- Componente pequeño `EstadoBaja` o reutilizar `estado-pill`:
  - `dado_de_baja` → `<span className="badge badge--baja">Dado de baja</span>`.
  - Activo → sin badge extra (o «ACTIVE» como hoy en Usuarios).

### 2.4 Servicios
- `src/services/users.ts`:
  ```ts
  listUsers(opts?: { incluirInactivos?: boolean })
  restaurarPersona(code)
  darDeBajaPersona(code)
  ```
- `src/services/personas.ts`: `restaurarPersona(code)`, `darDeBajaPersona(code)`.
- `src/services/consejeria.ts`: `listAlumnosConsejeria({incluirInactivos})`, `listMaestrosConsejeria({incluirInactivos})`.
- `src/services/matricula.ts`: `listMatriculas({incluirInactivos})`.
- Tipos:
  - `ResponseUser`: `dado_de_baja: boolean`.
  - `AlumnoConsejeria`/`MaestroConsejeria`: `dado_de_baja`.
  - `Matricula`: `alumno_status?`, `dado_de_baja`.

---

## 3. Pantallas

### 3.1 Usuarios (`src/routes/_app/usuarios.tsx`)
- `useQuery` con `incluirInactivos: puedeVerInactivos(roles)`.
- Fila inactiva → `rowClassName` `fila-baja`, badge «Dado de baja» en la columna Estado.
- Menú contextual:
  - `Ver` siempre.
  - `Editar` solo si activo.
  - `Dar de baja` si activo (conserva el historial).
  - `Restaurar` si `dado_de_baja` (con confirmación).
- Invalidar `['users']`, `['alumnos']`, `['maestros']`, `['responsables']`, `['consejeria-alumnos']`, `['consejeria-maestros']`, `['matriculas']` tras baja/restauración.

### 3.2 Alumnos de Consejería (`src/routes/_app/consejeria/alumnos.tsx`)
- Query con `incluirInactivos` según rol.
- Fila inactiva atenuada + badge «Dado de baja».
- Menú:
  - `Ver` siempre.
  - `Editar` solo activo.
  - `Dar de baja` si activo.
  - `Restaurar` si inactivo.
- No mostrar inactivos a consejería/director/secretaría/admisiones (el backend ya los filtra; además el helper evita enviar el parámetro).

### 3.3 Maestros de Consejería (`src/routes/_app/consejeria/maestros.tsx`)
- Mismo patrón que Alumnos.

### 3.4 Matrícula (`src/routes/_app/matricula.tsx`)
- Query con `incluirInactivos` según rol.
- Fila inactiva atenuada + badge «Dado de baja» en una columna Estado (o junto al código).
- Menú:
  - `Ver` siempre.
  - `Editar` solo activo.
  - `Dar de baja` si activo.
  - `Restaurar` si inactivo.
- Al restaurar, invalidar `['matriculas']`, `['alumnos']`, `['users']`, `['consejeria-alumnos']`.
- El wizard de edición no se abre para inactivos.

### 3.5 Comboboxes
- No requieren cambios de UI si el backend filtra.
- Verificar que ningún combobox construya opciones desde listas que incluyan inactivos:
  - Asignación/Horarios: `listMaestros`.
  - Matrícula: `getResponsableByCode`.
  - Disciplina/Excusas: búsqueda por código.
  - Estadísticas/Calificaciones: opciones de alumno.
- Si alguna pantalla usa `listUsers` para un combobox, no pasar `incluirInactivos`.

---

## 4. Permisos

- La visibilidad de inactivos se decide por **rol**, no solo por permiso:
  - `admin`, `admin_temporal`, `developer`.
- El backend vuelve a validar; el frontend solo evita enviar el parámetro a quien no corresponde.
- `Restaurar` requiere `personas:put` (o `users:put` según la pantalla) y el rol autorizado.

---

## 5. Tests (e2e)

Archivo nuevo `src/tests/e2e/bajas-restauracion.spec.ts`:
1. Admin da de baja a un alumno con matrícula y lo ve atenuado en Matrícula, Alumnos y Usuarios con «Dado de baja».
2. Admin pulsa «Restaurar» y el alumno vuelve a aparecer activo en Matrícula/Asistencia.
3. Consejería no ve al alumno inactivo en Alumnos ni en Matrícula.
4. El combobox de maestros en Asignación no incluye al maestro dado de baja.
5. El botón «Dar de baja» aparece para un alumno con vínculos y el alumno se restaura desde el mismo menú.
6. Restaurar un maestro lo devuelve al combobox de Asignación.

Regresión:
- `usuarios.spec.ts`, `matricula-edicion.spec.ts`, `consejeria-expediente.spec.ts`, `asignacion.spec.ts` (si existe).
- `tsc --noEmit`, `eslint`, `build`.

---

## 6. Riesgos

- **Filas atenuadas:** usar `opacity` sobre la fila; el badge debe quedar legible.
- **Doble fuente de estado:** usar `dado_de_baja` del backend, no inferir solo de `status`.
- **Cache:** invalidar todas las queries afectadas tras baja/restauración.
- **Móvil:** las cards deben mostrar el badge y el menú de 3 puntos con «Restaurar».
- **Finanzas:** por decisión del usuario, los inactivos no aparecen en cartera/mensualidades; el dato sigue en la base y vuelve al restaurar.
