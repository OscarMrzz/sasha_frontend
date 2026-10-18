# Plan de Especificación: Cards en móvil (tablas del maestro + horarios)

> Feature `018-cards-movil` · Frontend Sasha · v1
> Capa: **frontend** (`sasha_fronted/`). Solo frontend: no toca backend, API ni base de datos.

---

## 1. Problema y objetivo

- **Problema.** El maestro entra desde el celular o la tablet, pero las tablas se ven apretadas
  (scroll horizontal) y **todas las acciones de fila dependen del clic derecho** (`ctx-menu`), que no
  existe en táctil. Además, el horario se muestra como tabla semanal y en el celular no se lee.
- **Objetivo v1.**
  1. En **móvil/tablet** (`< 768px`), las tablas del maestro se ven como **cards minimalistas**
     (titular + pocos datos + estado) con un **botón de 3 puntos** que abre exactamente las mismas
     acciones que hoy da el clic derecho.
  2. El **horario** (maestro y alumno) en móvil se ve como la **vista por días del padre**
     (pestañas de días + lista).
  3. `/asistencia` del maestro **no cambia de estructura** (lista de alumnos + columna para pasar
     lista): solo se ajusta para que se vea bien en móvil.
  4. **El escritorio no cambia en nada** (misma tabla, mismo clic derecho, mismos `data-testid`).
- **Fuera de alcance (queda igual).** Todas las demás tablas del sistema: `/alumnos`, `/padres`,
  `/pagos`, `/matricula`, `/usuarios`, `/controladores`, `/catalogos/*`, `/excusas`,
  `/disciplina`, `/auditoria`, `/coordinaciones`, `/consejeria/*`, `/liberacion-notas`,
  `/notificaciones-admin`, `/contratos`, `/recibos`, `/configuracion-pagos`, `/sace` y la vista de
  `/tareas` de consejería/dirección/secretaría. Tampoco cambia el portal del padre/alumno (salvo el
  horario en móvil). Se revisará más adelante si hace falta.

### 1.1 Páginas incluidas (exactas)

| Ruta | Vista afectada | Card: titular · datos | 3 puntos |
|---|---|---|---|
| `/tareas` | `TareasStaffPage` (maestro/admin) | Título · Puntos · Entrega · pill Revisada/Sin revisar | Ver, Revisar, Cargar imagen, Tomar foto, Editar, Eliminar |
| `/calificaciones` | `CalificacionesStaffPage` (maestro) | Nombre · I/II/III/IV parcial con puntaje · Total · Promedio · Estado | *(sin acciones hoy)* |
| `/recuperaciones` | `DataTable` de la página | Cuenta/Nombre · Recuperación · Nota original · Nota que cuenta · Estado | Ver, Editar, Eliminar |
| `/plan-estudio` | `MaestroView` (maestro) | Clase · Aprobación · Activo · Auditoría | Ver, Editar/Auditar, Auditoría, Activar |
| `/horarios` | `MaestroHorarioView` (maestro) | Semana en **vista por días** (pestañas + lista) | Ver (por bloque) |
| `/horarios` / portal | `AlumnoHorarioView` (alumno) | Semana en **vista por días** (pestañas + lista) | — |
| `/asistencia` | `AsistenciaGridModal` inline (maestro) | **Sin cards**: lista de alumnos + columna, solo *responsive* | — |

---

## 2. Diseño

### 2.1 Detección de móvil (`src/hooks/use-media-query.ts`)

- `useMediaQuery(query: string): boolean` con `useSyncExternalStore` sobre `window.matchMedia`
  (se suscribe a `change`, limpia al desmontar, devuelve `false` en el servidor).
- `useEsMovil()` → `useMediaQuery('(max-width: 768px)')`, el mismo corte del shell (`style1.css:373`).
- Arranca en `false` (escritorio) y se corrige al hidratar: **un solo DOM**, sin `data-testid`
  duplicados (los e2e en estricto no fallan).

### 2.2 Botón de 3 puntos (`src/components/ui/RowMenu.tsx`)

- Botón `MoreVertical` + lista de opciones posicionada con `getBoundingClientRect()`, reutilizando
  las clases existentes `.ctx-menu` / `.ctx-menu__item` / `.ctx-menu__item--danger`
  (patrón ya usado en `maestro/index.tsx` y `maestro/clases.$asignacionId.tsx`).
- Cierra al elegir, con clic fuera y con `Esc`. `aria-haspopup="menu"`, `aria-expanded`, `role="menu"`.
- Tipo compartido `RowAction = { label; onClick; danger?; testId? }`. Los `testId` **reutilizan los
  mismos** del `ctx-menu` de cada página, para que las pruebas y los atajos sirvan igual.

### 2.3 Mecanismo en `DataTable` (una sola vez, no 33 parches)

Props nuevas **opcionales** (nada cambia si no se pasan):

- `card?: { title(row): ReactNode; fields?(row): { label; value }[]; status?(row): { label; tone } | null; testId?(row): string }`
- `rowActions?: (row: T) => RowAction[]`

Render: si hay `card` **y** `useEsMovil()` → `<ul class="data-cards">` en lugar de la tabla. Se
mantienen el título/conteo, buscador, filtros, Descargar y el **pager de 25**. `onRowClick`,
`onRowDoubleClick` y `onRowContextMenu` siguen igual (escritorio intacto).

### 2.4 Horario en móvil (`HorarioDiasView`)

- Extraer de `routes/_app/hijo/horario.tsx` un componente `HorarioDiasView`
  (`src/components/horarios/HorarioDiasView.tsx`): recibe bloques normalizados
  `{ dia, horaInicio, horaFin, titulo, sub, recreo? }` + `testIdPrefix` y pinta `dias-tabs` +
  `app-list` (mismo markup y clases que hoy usa el padre).
- **Padre:** `hijo/horario.tsx` pasa a usar el componente (mismos `data-testid`
  `padre-horario-dia-N` / `padre-horario-lista`).
- **Alumno:** en móvil, `AlumnoHorarioView` usa `HorarioDiasView` con los `slots` del portal
  (mismo shape `PortalHorarioSlot`); en escritorio sigue `HorarioSemanaGrid`.
- **Maestro:** en móvil, `MaestroHorarioView` usa `HorarioDiasView` mapeando `/horarios/mio`;
  cada bloque conserva la acción **Ver** (por clic derecho en escritorio y por 3 puntos en móvil).
- Días: lun–vie siempre; sáb/dom solo si tienen bloques (igual que `HorarioSemanaGrid`).

### 2.5 Asistencia (móvil, sin cards)

`AsistenciaGridModal` con `inline` (la vista del maestro en `/asistencia`): solo *responsive*.
En `<768px`: scroll horizontal con la **columna del alumno fija**, celdas de asistencia con área
táctil ≥ 40 px, toolbar y botones (`asistencia-ver-faltas`, `asistencia-puntos`) apilados y topbar
correcta. La lógica de marcar (`asistencia-celda-{codigo}-{fecha}`) no cambia.

### 2.6 Estilos (`src/styles/style1.css`)

- Nuevos: `.data-cards`, `.data-card`, `.data-card__title`, `.data-card__fields`, `.data-card__field`,
  `.data-card__status`, `.row-menu`, `.row-menu__btn`, `.row-menu__list`.
- Bloque `@media (max-width: 768px)` solo para asistencia.
- **Regla de diseño:** colores sólidos de los tokens, **sin degradados**.

---

## 3. Archivos

| Archivo | Cambio |
|---|---|
| `src/hooks/use-media-query.ts` | Nuevo: `useMediaQuery` + `useEsMovil`. |
| `src/components/ui/RowMenu.tsx` | Nuevo: botón 3 puntos + menú. |
| `src/components/ui/DataTable.tsx` | Props `card` y `rowActions`; render de cards en móvil. |
| `src/components/horarios/HorarioDiasView.tsx` | Nuevo: vista por días reutilizable. |
| `src/routes/_app/hijo/horario.tsx` | Usa `HorarioDiasView` (mismos testid). |
| `src/components/horarios/AlumnoHorarioView.tsx` | Móvil → `HorarioDiasView`. |
| `src/components/horarios/MaestroHorarioView.tsx` | Móvil → `HorarioDiasView` + 3 puntos por bloque. |
| `src/routes/_app/tareas.tsx` | `card` + `rowActions` en la tabla staff. |
| `src/routes/_app/calificaciones.tsx` | `card` en la vista del maestro. |
| `src/routes/_app/recuperaciones.tsx` | `card` + `rowActions`. |
| `src/routes/_app/plan-estudio.tsx` | `card` + `rowActions` en `MaestroView`. |
| `src/components/asistencia/AsistenciaGridModal.tsx` | Ajustes de markup para móvil (sin cards). |
| `src/styles/style1.css` | Estilos nuevos + `@media`. |
| `src/tests/e2e/cards-movil.spec.ts` | Nuevo: e2e con viewport móvil. |

---

## 4. Tests / verificación

- `pnpm exec tsc --noEmit`, `pnpm exec eslint <archivos>`, `pnpm build`.
- e2e nuevo `cards-movil.spec.ts` con `test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })`:
  - en cada página incluida: la card se ve, la tabla no, el **3 puntos abre el menú** con los mismos
    ítems y **una acción funciona** (p. ej. tareas → Revisar abre `tarea-revision-modal`);
  - horario del maestro y del alumno: pestañas de días + lista;
  - `/asistencia` del maestro usable en móvil (lista + celdas).
- Los **25 specs de escritorio** deben seguir en verde: no se toca ningún `data-testid` ni el clic
  derecho.

---

## 5. Riesgos y decisiones abiertas

- **SSR/hidratación:** el primer render es escritorio; `useMediaQuery` lo corrige sin duplicar DOM.
- **Calificaciones:** hoy no tiene acciones de fila, así que su card **no lleva 3 puntos** (no hay
  nada que ofrecer). Si se quisiera (p. ej. «Ver boleta»), se agrega después.
- `/tareas` (staff), `/calificaciones` (staff) y `/recuperaciones` las comparten más roles que el
  maestro (admin, consejería…): la card aplica a quien las abra en móvil.
- El 3 puntos **no** se agrega a la tabla de escritorio (así se pidió): escritorio queda igual.

## 6. Fuera de alcance

- Backend, API y base de datos (**no requiere migración**).
- El resto de tablas y vistas (se listan en §1) y el portal del padre/alumno salvo el horario móvil.
