# Plan de Especificación: Temas de estilos (hoja activa conmutable)

> Feature `006-temas-de-estilos` · Plataforma escolar Sasha · capa **frontend** (`sasha_fronted/`) · v1

---

## 1. Visión General y Objetivos

- **Problema.** Todo el diseño visual vive mezclado: `src/styles.css` (entry) importa `src/styles/app.css` (175 KB, 857 clases) que a su vez importa `tokens.css` (paleta) y `neon.css`. No hay una separación entre **cómo se usa un bloque** (contrato: "un botón principal", "una card", "un modal") y **cómo se ve** (detalles visuales). Cambiar de diseño obliga a tocar el archivo grande y arriesga romper todo.
- **Objetivo v1.** Separar el estilo en dos capas:
  1. **`src/styles.css`** — hoja **principal y estable**. Centraliza el **contrato de estilos** (catálogo documentado de los bloques semánticos y sus clases) y **selecciona la hoja de diseño activa** con una sola línea `@import`. No cambia al cambiar de diseño.
  2. **`src/styles/style1.css`** — hoja de **detalles del diseño 1** (todo el CSS actual). Autocontenida: trae su paleta (`tokens.css`) y sus componentes propios (`neon.css`).
- **Resultado.** Para montar otro diseño se crea `style2.css` (u otra) y en `styles.css` se cambia **una línea**. Volver al original es volver a cambiar esa línea. La principal no se toca.

### Fuera de alcance (v1)

- No se rediseña nada visualmente: `style1.css` es idéntico al `app.css` actual.
- No se convierten los colores a un contrato de variables nuevo (se conserva `tokens.css` como parte del diseño 1).
- No hay selector de tema en la UI (el cambio de diseño es por archivo). El tema claro/oscuro (`data-theme`) sigue igual.

---

## 2. Contexto técnico verificado (rutas reales)

- **Entry actual:** `src/styles.css` (52 líneas) es importado por `src/routes/__root.tsx` (`import appCss from '../styles.css?url'`). Contiene:
  - fuentes (Montserrat, Inter), `@import 'tailwindcss'`, `@import './styles/app.css'`;
  - resets globales (`* { box-sizing }`, `html/body/#app`, `body`) y la decoración `body::before` (franjas con `linear-gradient`).
- **Diseño actual:** `src/styles/app.css` (857 clases, BEM). En su cabecera: `@import './tokens.css'` y `@import './neon.css'`. No define reglas globales de `body`/`:root` (solo un `@media` con `html, body`).
- **Paleta:** `src/styles/tokens.css` (`:root` y `[data-theme='light']`, variables `--sasha-*`).
- **Componentes propios:** `src/styles/neon.css` (clases `.neon-*`).
- **Bloques semánticos reales** (prefijos de clase): `btn`, `badge`, `field`, `combobox`, `search-input`, `data-table`, `mdash` (bento), `card-*`, `modal`, `ctx-menu`, `empty-state`, `sidebar-*`, `app-shell`, `user-panel`, `user-menu`, `mobile-nav`, `aviso-banner`, `notif-*`, `cmdk`, `wizard-*`, `nivel-check`, `neon-*`, entre otros.
- **Reglas de diseño:** sin degradados (REG-UI-01) — nota: el `body::before` actual usa un `linear-gradient` como fondo decorativo; se conserva dentro de `style1.css` (diseño 1) sin cambiar su aspecto.

---

## 3. Decisión de diseño

### 3.1 Dos capas

```
src/styles.css            ← PRINCIPAL (estable). Contrato + elige el diseño activo.
        │
        └── @import './styles/style1.css'   ← DISEÑO ACTIVO (detalles)
                    ├── @import './tokens.css'   (paleta del diseño)
                    └── @import './neon.css'     (componentes propios del diseño)
```

- La principal conserva lo que **no** cambia entre diseños: fuentes, Tailwind, resets globales y `body` base (que usan tokens del diseño).
- Los **detalles** (colores, sombras, radios, animaciones decorativas como `body::before`) viven en la hoja de diseño.

### 3.2 El contrato

`src/styles.css` documenta (en un comentario estructurado) los **bloques semánticos** que toda hoja de diseño debe implementar, con sus clases y modificadores. Es la referencia central: "un botón principal es `.btn.btn--primary`; uno secundario/ghost es `.btn.btn--ghost`; una card es `.card`…".

### 3.3 Cómo cambiar de diseño

1. Crear `src/styles/style2.css` (puede importar su propia paleta y componentes).
2. En `src/styles.css`, cambiar **una línea**:
   ```css
   @import './styles/style2.css';
   ```
3. Volver al diseño 1: `@import './styles/style1.css';`.

---

## 4. Archivos

### Nuevos
- `src/styles/style1.css` — contenido actual de `app.css` (renombre) + el bloque decorativo `body::before` movido desde la principal.
- `documentacion/ESTILOS.md` — análisis, contrato y guía para agregar un diseño.

### Modificados
- `src/styles.css` — pasa a ser la principal: contrato documentado + `@import './styles/style1.css'` + resets globales (sin `body::before`).
- `documentacion/MAPA.md` — línea de capas: `app.css` → `style1.css` + `styles.css`.

### Eliminados
- `src/styles/app.css` (renombrado a `style1.css`).

---

## 5. Criterios de aceptación

1. `src/styles.css` no contiene detalles de componentes; solo fuentes, Tailwind, contrato documentado, resets y la línea del diseño activo.
2. Cambiar esa línea a otra hoja cambia todo el look sin tocar nada más.
3. `src/styles/style1.css` reproduce el diseño actual **idéntico** (mismo `app.css` + `body::before`).
4. El build y los tipos siguen OK; la app se ve igual que antes.
5. `documentacion/ESTILOS.md` explica la arquitectura y cómo agregar `style2.css`.

---

## 6. Verificación

- `pnpm exec tsc --noEmit` y `pnpm build` sin errores nuevos.
- Prueba visual rápida (misma apariencia). El usuario ya prueba manualmente.
