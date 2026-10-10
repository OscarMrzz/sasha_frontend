# Estilos y temas del frontend Sasha

Cómo está organizado el CSS y cómo cambiar de diseño sin tocar el resto. Bitácora: [`EVOLUCION.md`](EVOLUCION.md). Mapa general: [`MAPA.md`](MAPA.md).

## Idea

El estilo está partido en **dos capas**:

1. **`src/styles.css` — hoja principal (estable).** Centraliza el **contrato de estilos**: el catálogo de bloques semánticos y sus clases (qué es un botón principal, uno secundario, una card, una tabla, un modal…). Además **elige la hoja de diseño activa** con una sola línea `@import`. No describe colores ni detalles: eso es del diseño.
2. **`src/styles/style1.css` — hoja de diseño (detalles).** El aspecto real del diseño actual. Es autocontenida: trae su paleta (`tokens.css`) y sus componentes propios (`neon.css`).

```
src/styles.css                      ← principal (no cambia al cambiar de diseño)
        │
        └── @import './styles/style2.css'     ← DISEÑO ACTIVO
                    ├── @import './style1.css'   (base de componentes del diseño 1)
                    │       ├── tokens.css
                    │       └── neon.css
                    └── piel "Matte Dark" (tokens + bloques re-estilizados)
```

`src/routes/__root.tsx` importa `src/styles.css?url` y lo pone como `<link rel="stylesheet">`. Nada más importa CSS.

## Diseños disponibles

| Hoja | Nombre | Qué es |
|---|---|---|
| `src/styles/style1.css` | **Lumier Dark** (original) | El diseño base. Autocontenido: importa `tokens.css` y `neon.css`. |
| `src/styles/style2.css` | **Matte Dark** (activo) | Hereda `style1.css` (todos los componentes) y cambia la piel: oscuros mate, esquinas redondeadas, sombras suaves/inset y acento naranja corporativo. |

`style2.css` es una **capa de re-estilizado**: importa `style1.css` y sobrescribe tokens y los bloques principales. Así, los componentes nuevos que se agreguen a `style1.css` siguen funcionando en el diseño 2.

## Cambiar de diseño

En `src/styles.css` hay una línea marcada como **DISEÑO ACTIVO**:

```css
/* >>> DISEÑO ACTIVO <<< */
@import './styles/style2.css';
```

- **Volver al diseño original:** cambia esa línea a `@import './styles/style1.css';`.
- **Montar otro diseño:** crea `src/styles/style3.css` (con su paleta y sus detalles) y cambia esa línea.
- La hoja principal **no se toca**; solo cambia esa línea.

### Crear `style2.css`

1. Copia `style1.css` como punto de partida (o escribe desde cero).
2. Trae su paleta: define `:root` y `[data-theme='light']` con las variables `--sasha-*` (ver el contrato). Si quieres, su propio `tokens.css`/`neon.css`.
3. Implementa las clases del **contrato** con el mismo nombre y significado (cambia el aspecto, no el contrato).
4. Respeta las reglas: **sin degradados** (REG-UI-01) y buscadores con placeholder «Buscar…» (REG-UI-11).
5. Cambia la línea del diseño activo en `src/styles.css`.

## El contrato

El catálogo completo, con las clases reales, vive **como comentario en `src/styles.css`** (sección «CONTRATO DE ESTILOS»). Bloques principales:

- **Paleta/tokens:** variables `--sasha-*` en `:root` del diseño; tema claro con `[data-theme='light']`.
- **Texto:** `.texto-primary`, `.texto-muted`, `.texto-emphasis`, `.texto-title`, `.page-title`.
- **Botones:** `.btn`, `.btn--primary` (principal), `.btn--ghost` (secundario), `.btn--danger`, `.btn--sm`, `.btn-submit`, `.app-boton-grande`.
- **Campos:** `.field`, `.field__label/input/select/textarea/error`, `.combobox`, `.switch`, `.nivel-check`.
- **Buscador:** `.search-input` (placeholder siempre «Buscar…»).
- **Tabla de registros:** `.data-table-wrap`, `.data-table`, `.data-table__th(--sortable)`, `.data-table__pager`, etc.
- **Superficies/tarjetas:** `.card-left`, `.card-right`, `.wizard-card`, `.clase-card`, `.tarea-card`, `.hijo-card`, `.neon-surface`, bento `.mdash__bento`, `.notas-bento`, `.analisis-bento`, `.resultado-bento`.
- **Modales:** `.modal-backdrop(--closing)`, `.modal(--wide|--xl|--board)`, `.modal__header/body/footer/title`.
- **Menú de fila:** `.ctx-menu`, `.ctx-menu__item(--danger)`.
- **Sidebar/navbar:** `.app-shell`, `.app-shell__top`, `.app-shell__sidebar(--collapsed)`, `.sidebar-nav__item(--active)`, `.sidebar-toolbar`, `.sidebar-clase`, `.user-panel`, `.user-menu`, `.mobile-nav`.
- **Badges:** `.badge(--ok|--warn|--danger|--muted)`, `.nivel-badge`, `.sancion-badge`, `.estado-pill`.
- **Avisos/notificaciones:** `.aviso-banner`, `.notif-*`.
- **Wizard:** `.wizard-steps`, `.wizard-card`, `.wizard-grid`, `.wizard-pane`, `.wizard-summary`, `.wizard-success`.
- **Buscador de comandos (Ctrl+K):** `.cmdk*`.
- **Vacíos:** `.empty-state`.

## Notas

- El **tema claro/oscuro** se activa con `data-theme="light"` en `<html>` (lo maneja `AppShell`); cada diseño define ambos con sus tokens.
- Los tokens (`--sasha-*`) son el puente entre el diseño y los componentes: si un diseño cambia un color, solo cambia su `tokens.css`.
- `style1.css` reproduce exactamente el diseño anterior (antes `app.css`), incluida su decoración de fondo (`body::before`).
