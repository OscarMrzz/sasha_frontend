# Plan de Especificación: Diseño 2 «Matte Dark»

> Feature `007-tema-matte-dark` · Plataforma escolar Sasha · capa **frontend** (`sasha_fronted/`) · v1

---

## 1. Visión General y Objetivos

- **Problema.** Se quiere un segundo diseño visual (referencia: "Professional Matte Dark Dashboard") sin reescribir los 857 selectores del diseño 1.
- **Objetivo v1.** Crear `src/styles/style2.css` que **re-estilice** toda la app con:
  - colores **oscuros mate** del ejemplo (se conservan tal cual),
  - esquinas redondeadas, sombras suaves e inset,
  - **acento = naranja corporativo** de Sasha (reemplaza el azul/índigo del ejemplo) y semánticos corporativos.
- **Regla.** Sin degradados (REG-UI-01): el fondo radial del ejemplo se resuelve con color sólido.

## 2. Estrategia

`style2.css` **importa `style1.css`** (todos los componentes ya implementados) y luego **sobrescribe** `:root`/`[data-theme='light']` (tokens) y los bloques principales (botones, campos, tarjetas, tabla, modales, menús flotantes, sidebar/navbar, badges, títulos, scrollbar). Así los componentes nuevos que se agreguen a `style1.css` siguen funcionando.

## 3. Archivos

- **Nuevo:** `src/styles/style2.css`.
- **Modificado:** `src/styles.css` (línea del diseño activo → `style2.css`), `documentacion/ESTILOS.md`, `documentacion/MAPA.md`.

## 4. Criterios de aceptación

1. `style2.css` activado cambia el look de botones, cards, tabla, modales, buscador, sidebar/navbar y badges.
2. Los oscuros del ejemplo se conservan; el acento es el naranja corporativo.
3. El build incluye `style2.css` (heredando `style1.css`).
4. Volver a `style1.css` restaura el diseño original con una sola línea.

## 5. Verificación

- `pnpm build` OK; el CSS compilado contiene tokens mate, `#21242b` y `#ff5023`.
