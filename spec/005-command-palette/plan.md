# Plan de Especificación: Buscador de comandos (Ctrl+K)

> Feature `005-command-palette` · Plataforma escolar Sasha · capa **frontend** (`sasha_fronted/`) · v1
> Aprobación de requisitos: sesión con el usuario (todo recomendado aceptado).

---

## 1. Visión General y Objetivos

- **Problema.** Navegar por el sidebar es lento: hay muchas páginas y el usuario sabe qué busca, pero leer el menú completo cuesta. También falta un atajo para crear registros sin recorrer la interfaz.
- **Objetivo v1.** Un **buscador de comandos** estilo VSCode que se abre con **Ctrl+K** (y **Cmd+K** en Mac):
  - modal centrado y pequeño, con **fondo oscuro y desenfocado** (blur, sin degradados);
  - al escribir, filtra debajo una lista de **páginas** ("Ir a") y **acciones** ("Agregar");
  - se navega con **↑ / ↓** y se ejecuta con **Enter**; **Escape** cierra;
  - cada comando tiene **palabras clave ocultas** (sinónimos) para encontrarlo aunque el nombre no coincida:
    `clase` → Cursos, `estudiante`/`niños` → Alumnos, etc.
  - las acciones "Agregar X" navegan a su página **y abren el modal de creación**.
- **Solo aparece lo que el rol activo puede ver**, con las mismas reglas que el sidebar (`permission` + `hideForRoles`).
- **Sin dependencias nuevas** (no `cmdk`); el filtrado y la navegación por teclado son propios.

### Fuera de alcance (v1)

- Búsqueda de registros concretos (alumnos, tareas…) por nombre: v1 busca **páginas y acciones**, no entidades.
- Historial de comandos recientes, atajos por página, y edición de atajos desde la UI.
- App móvil (`sasha_movil/`) y backend.

---

## 2. Contexto técnico verificado (rutas reales)

Frontend React 19 + TanStack Start (`sasha_fronted/`):

- **Shell global:** `src/components/layout/AppShell.tsx` — envuelve todo `_app` (vía `src/routes/_app.tsx`). Ya escucha `keydown`, maneja tema, sidebar colapsable, portal y notificaciones. Aquí se monta el palette y el listener de `Ctrl+K`.
- **Menú y permisos:** `src/helpers/nav.ts` (`NAV_ITEMS` con `permission`, `hideForRoles`) y `src/helpers/permissions.ts` (`rolesHavePermission`, `Permission`, `RoleName`).
- **Permisos en React:** `src/components/gates/Can.tsx` (`useCan(): { can, roles }`).
- **Modal reutilizable:** `src/components/ui/Modal.tsx` (animación, `Escape`, backdrop). El palette usa su propia superficie (más pequeña, foco atrapado en el input) pero reutiliza tokens y patrón de backdrop.
- **Tokens:** `src/styles/tokens.css` (`--sasha-backdrop`, `--sasha-bg-overlay`, `--sasha-bg-raised`, `--sasha-border-fuerte`, `--sasha-bg-hover`, `--sasha-accent`, `--sasha-radius`). `src/styles/app.css` (BEM). **Sin degradados** (REG-UI-01). Buscadores dicen solo «Buscar…» (REG-UI-11).
- **Rutas:** `src/routes/_app/**` (TanStack Router file-based, `createFileRoute`). Algunas ya exponen **search params** (`validateSearch`, `Route.useSearch`, `Route.useNavigate`), p. ej. `tareas.tsx` (`?revisar=`).
- **Iconos:** `lucide-react`. El mapa icono→componente hoy vive dentro de `AppShell.tsx` (`ICONS`).

---

## 3. Decisiones de diseño

### 3.1 Dos registros separados

1. **Atajos de teclado en JSON** — `src/config/atajos-teclado.json` (lo pedido). Cada atajo:
   `{ id, titulo, descripcion, atajo, activo }`. `activo: false` desactiva ese atajo. v1 tiene uno: `abrir-buscador-comandos` (`Ctrl+K`).
2. **Registro de comandos en TS** — `src/helpers/command-palette.ts`: necesita tipos (`Permission`, `RoleName`) y rutas, por eso vive en TypeScript. Contiene:
   - **sinónimos por ruta** (`palabrasClave`);
   - **descripciones cortas** por ruta (se muestran en la lista);
   - **acciones "Agregar X"** con su permiso, ruta destino e `intentId`.

Los comandos "Ir a" se derivan de `NAV_ITEMS` en `AppShell` (así heredan `permission`/`hideForRoles`); los "Agregar" salen de `COMANDOS_AGREGAR`.

### 3.2 Apertura del modal de creación al navegar

Un comando "Agregar tarea" debe abrir el modal de `/tareas`. v1 usa un **bus de intención** simple, sin ensuciar la URL:

- `src/lib/accion-palette.ts`: `solicitarAccion(id)` guarda el id en `sessionStorage` **y** dispara un evento `window` (`sasha:accion-palette`); `consumirAccion(id)` lo lee y limpia; `alRecibirAccion(id, cb)` escucha el evento.
- `src/hooks/use-accion-palette.ts`: `useAccionPalette(id, handler)` consume la intención al montar (navegación entre páginas) y también la escucha (misma página).
- Así: si navegas a otra ruta, la página nueva la consume al montar; si ya estabas en ella, el evento la dispara al vuelo.

**Acciones de v1 (10):** tarea, curso, grado, sección, modalidad, periodo, usuario, excusa, ficha disciplinaria, matrícula.

### 3.3 Iconos compartidos

Se extrae el mapa de iconos de `AppShell` a `src/components/layout/nav-icons.tsx` (`NAV_ICONS` + `<NavIcon name className />`) para reutilizarlo en sidebar y palette sin duplicar.

### 3.4 Filtrado y ranking

`buscarComandos(comandos, consulta)` normaliza (minúsculas, sin acentos), exige que **todos los tokens** coincidan (AND) y puntúa: título `startsWith` > palabra del título `startsWith` > título `includes` > palabra clave `startsWith` > palabra clave `includes` > descripción `includes`. Orden descendente. Sin consulta, se muestran todos (Ir a y luego Agregar).

---

## 4. Archivos

### Nuevos
- `src/config/atajos-teclado.json`
- `src/helpers/command-palette.ts`
- `src/lib/accion-palette.ts`
- `src/hooks/use-accion-palette.ts`
- `src/components/layout/nav-icons.tsx`
- `src/components/layout/CommandPalette.tsx`

### Modificados
- `src/components/layout/AppShell.tsx` — monta `<CommandPalette>`, listener `Ctrl/Cmd+K`, deriva comandos de `NAV_ITEMS` + acciones, usa `<NavIcon>`.
- `src/styles/app.css` — bloque `.cmdk*` (backdrop oscuro + blur, caja, input, lista, grupos, item activo).
- `tsconfig.json` — `resolveJsonModule: true` (importar el JSON tipado).
- Rutas con `useAccionPalette`:
  `src/routes/_app/tareas.tsx`, `catalogos/cursos.tsx`, `catalogos/grados.tsx`, `catalogos/secciones.tsx`, `catalogos/modalidades.tsx`, `catalogos/periodos.tsx`, `usuarios.tsx`, `excusas/index.tsx`, `disciplina/index.tsx`, `matricula.tsx`.

---

## 5. Criterios de aceptación

1. `Ctrl+K`/`Cmd+K` abre el buscador; `Escape` lo cierra; clic en el fondo lo cierra.
2. Al escribir, la lista se filtra; `↑`/`↓` mueven la selección (con ciclo) y `Enter` ejecuta.
3. Un comando "Ir a" navega a su página.
4. Un comando "Agregar X" navega a su página y abre su modal de creación (incluida la misma página).
5. Los sinónimos funcionan: `clase` encuentra Cursos, `estudiante`/`niños` encuentran Alumnos, etc.
6. Solo se listan comandos permitidos por el rol activo (mismo criterio que el sidebar).
7. `activo: false` en `atajos-teclado.json` desactiva el atajo.
8. Sin degradados; buscador con placeholder «Buscar…»; funciona en claro y oscuro.
9. `tsc`/build sin errores nuevos.

---

## 6. Verificación

- `pnpm exec tsc --noEmit` (tipos). `pnpm build` si hace falta.
- Prueba manual con un rol con sidebar (admin) y uno sin sidebar (maestro): abrir, buscar, crear.
- Sin tests e2e nuevos en v1 (el usuario pidió rapidez); el MAPA se actualiza tras confirmar.
