# Plan de Especificación: Coordinaciones al editar un usuario — Frontend

> Feature `014-coordinaciones-al-editar-usuario` · Frontend Sasha (React 19 + TanStack Start) · v1
> Capa: **frontend** (`sasha_fronted/`). El selector de **Coordinaciones** aparece también al
> **editar** un usuario cuando su rol es **Coordinador** (hoy solo aparece al **crear** el usuario),
> y se guarda con el endpoint que ya existe. Cierra el hueco de [[DEC-018]]: un usuario convertido en
> coordinador quedaba sin alcance y no había forma de asignárselo desde la UI.
> **Solo frontend**: no toca backend, endpoints, permisos ni base de datos. **No requiere migración.**
> El flujo de **crear** usuario (que ya funcionaba) **no cambia**, solo se reusa el mismo componente.

---

## 1. Objetivo

- Poder **asignar coordinaciones a un usuario ya creado**, no solo al crearlo.
- Que al poner el rol **Coordinador** (al crear o al editar) aparezca el mismo bloque de
  **checkboxes de coordinaciones**, con las actuales premarcadas al editar.
- Que **no se pueda guardar** un coordinador sin al menos una coordinación (igual que al crear).
- Que el flujo de **creación** siga funcionando idéntico (mismos `data-testid`).

---

## 2. Alcance

**Solo frontend.** Nada de backend, endpoints, permisos ni migraciones (el endpoint
`GET/PUT /coordinaciones/usuario/{code}` y el permiso `coordinaciones:put` ya existen).

En alcance:

- Extraer el selector local de `usuarios.tsx` a un componente compartido
  `src/components/coordinaciones/CoordinacionesSelect.tsx`.
- Usarlo en el **alta de usuario** (`usuarios.tsx`, sin cambiar su comportamiento ni sus `data-testid`).
- Mostrarlo en **`PersonaEditModal`** cuando el rol elegido es `coordinador` (y la sesión puede editar
  rol con `users:put` y asignar con `coordinaciones:put`), precargando las coordinaciones actuales.
- En el guardado de la edición, asignar las coordinaciones **después** de cambiar el rol.

Fuera de alcance (explícito):

- **Backend / API**: `GET /coordinaciones/usuario/{code}` y `PUT /coordinaciones/usuario/{code}` **no cambian**.
- **Permisos**: no se crea ningún permiso nuevo (`coordinaciones:put` ya lo tienen admin/admin_temporal/developer).
- **Base de datos**: sin migración.
- **Matrícula**: `PersonaEditModal` con `permitirRol={false}` (uso en `/matricula`) **no** muestra nada nuevo.
- No se limpian las filas `user_coordinacion` cuando un coordinador deja de serlo (el alcance del backend
  solo aplica al rol activo; dejarlas es inocuo).

---

## 3. UI

- **Componente `CoordinacionesSelect`**: `Field` «Coordinaciones» con la lista de checkboxes
  (clase `coord-lista` / `coord-check`) ya existente. Filtra a las activas **más** las ya marcadas.
  Muestra error «Elige al menos una coordinación.» si el valor va vacío.
  - Props: `value: string[]`, `onChange: (ids) => void`, `testIdPrefix?: string` (default `user`).
  - `data-testid`: `${prefix}-coordinaciones` (contenedor) y `${prefix}-coordinacion-${titulo}` (cada opción).
- **Alta de usuario** (`usuarios.tsx`): se sigue mostrando cuando `roles[0] === 'coordinador'`; usa
  `testIdPrefix="user"` (default) → conserva `user-coordinaciones` / `user-coordinacion-…`.
- **Edición** (`PersonaEditModal`): dentro del bloque `Can users:put`, junto al `Rol`/`Estado`, aparece
  el selector cuando `form.rol === 'coordinador'`. `testIdPrefix="persona-edit"`.
  - Si el rol original ya era `coordinador`, se precargan sus coordinaciones con
    `GET /coordinaciones/usuario/{code}` y se muestra «Cargando coordinaciones…» mientras llegan.
  - Al marcarlo/desmarcarlo, el formulario se marca `dirty` (habilita «Guardar»).
  - El botón «Guardar» queda **deshabilitado** si es coordinador y no hay ninguna coordinación marcada.
- **Sin degradados**: se reusan tokens/clases existentes (REG-UI-01).

---

## 4. Archivos a tocar

| Archivo | Cambio |
|---|---|
| `src/components/coordinaciones/CoordinacionesSelect.tsx` | **Nuevo**. Componente compartido (checkboxes + `Field` + estados de carga/vacío/error), con `testIdPrefix`. |
| `src/routes/_app/usuarios.tsx` | Quitar el `CoordinacionesSelect` local y `listCoordinaciones` del import; importar el compartido; usarlo con `testIdPrefix="user"`. |
| `src/components/personas/PersonaEditModal.tsx` | Estado `coordSel`; query `coordinacionesDeUsuario(code)` (solo si el rol original es coordinador y hay permisos); efecto que precarga; `requiereCoordinaciones` en `valid`; `asignarCoordinaciones` tras `updateRoles`; render del selector. |
| `src/tests/e2e/coordinador.spec.ts` | Test: crear un usuario, editarlo a Coordinador y comprobar que aparece el selector, exige ≥1 y guarda. |

Notas de implementación:

- **Orden de guardado**: `updateRoles` debe correr **antes** de `asignarCoordinaciones`, porque el backend
  valida que el usuario sea `coordinador` (si no, 400).
- `asignarCoordinaciones` se llama solo cuando el rol resultante es `coordinador` y hay permisos; es
  idempotente (reemplaza la lista).
- No se altera el `data-testid` de creación para no romper el e2e existente.

### Contratos / tipos

- `CoordinacionesSelectProps` (nuevo): `{ value: string[]; onChange: (ids: string[]) => void; testIdPrefix?: string }`.
- Sin cambios en `src/services/coordinaciones.ts` ni en DTOs (ya existen `coordinacionesDeUsuario` y `asignarCoordinaciones`).

---

## 5. Reglas aplicadas (REG-UI)

- **REG-UI-01** (tokens y **sin degradados**): reusa `coord-lista`/`coord-check` y `Field` existentes.
- **REG-UI-04** (formularios/acciones en modal con confirmación): la edición ya guarda con `ConfirmDialog`.
- **REG-UI-08** (wizards/validación): la regla «coordinador ⇒ ≥1 coordinación» se mantiene igual que al crear.

---

## 6. Tests

- `pnpm generate-routes` (no hay rutas nuevas; se corre para validar el árbol).
- `tsc --noEmit`.
- `eslint` de los archivos tocados.
- **e2e (Playwright)**: nuevo caso en `coordinador.spec.ts` — crear usuario, editar a Coordinador,
  verificar selector, `persona-edit-save` deshabilitado sin marcar, habilitado con una marcada, guardar y
  ver «Coordinador» en la fila. Requiere backend + DB (el e2e usa `molde_test`, que se recrea): si no están
  levantados, se documenta como no ejecutado.

---

## 7. Cierre

- Al terminar, **preguntar** si se actualiza el **MAPA** de frontend (`sasha_fronted/documentacion/MAPA.md`)
  y si se marcan las notas del **vault** (`Trabajo/Paneles`, `Trabajo/Tareas`, `Trabajo/Sesiones`).
  **No editar MAPA ni vault en silencio.**
- **No requiere backend ni migración.** Confirmado: solo se toca `sasha_fronted/`.
