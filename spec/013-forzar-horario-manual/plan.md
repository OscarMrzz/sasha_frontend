# Plan de Especificación: Forzar horario manual — Frontend

> Feature `013-forzar-horario-manual` · Frontend Sasha (React 19 + TanStack Start) · v1
> Capa: **frontend** (`sasha_fronted/`). Un checkbox **«No permitir forzar»** en el panel manual
> de armado de horarios que, al desmarcarse, avisa con un modal y luego deja **colocar/mover**
> bloques **ignorando el conflicto de MAESTRO** (mismo maestro, mismo día, misma hora de inicio).
> El conflicto de **SECCIÓN** sigue bloqueado.
> **Solo frontend**: no toca backend, endpoints, permisos ni base de datos. **No requiere migración.**
> El **generador automático** (`Generar` → `POST /horarios/preview`) **no cambia**.

---

## 1. Objetivo

- Permitir, de forma **consciente y explícita**, que el armado manual de una versión de horario
  **fuerce el choque de maestro**: que un mismo maestro quede en varias secciones a la misma hora.
  Hoy `isPlaceable` bloquea ambos conflictos (maestro y sección) con el toast actual.
- Que el permiso sea **opt-in por sesión de armado**: por defecto (comportamiento actual) se sigue
  bloqueando; el usuario debe desmarcar **«No permitir forzar»** y aceptar un aviso.
- Que el cambio sea **efímero**: aplica **solo al horario que se está armando en ese momento**
  (estado del builder); **no se persiste** en la versión guardada ni en el backend.
- Que **el conflicto de sección nunca se pueda forzar**: dos clases en la misma sección a la misma
  hora siguen bloqueadas.
- Que el **generador automático** quede intacto.

---

## 2. Alcance

**Solo frontend** (`sasha_fronted/`). Nada de backend, ni endpoints, ni permisos, ni migraciones.

En alcance:

- Checkbox **«No permitir forzar»** en el panel manual (footer del `<Modal board>`).
- Modal de advertencia de **un solo botón «Cerrar»** al desmarcar.
- Prop `permitirForzar` en `HorarioBoard` y rama condicional en la validación de colocación.
- Estado efímero en la página (`permitirForzar`, `avisoForzar`), reseteado al abrir/cerrar el wizard.

Fuera de alcance (explícito):

- **Backend / API**: `POST /horarios/preview`, `POST /horarios/confirm` y demás endpoints **no cambian**.
- **Generador automático**: el botón **«Generar»** y el flujo `POST /horarios/preview` **no cambian**;
  el nuevo permiso **no** altera sus resultados.
- **Persistencia**: `permitirForzar` **no** viaja en `slotsFromPlaced`, ni en el confirm, ni se guarda.
- **Permisos**: no se crea ningún permiso nuevo.
- **Base de datos**: sin migración.

---

## 3. UI

- **Ubicación del checkbox**: en el **footer del `<Modal board>`** (`src/routes/_app/horarios.tsx`,
  ~766-795), **junto a «Activar al guardar»**, aprovechando el `marginRight: 'auto'` que ya empuja ese
  grupo a la izquierda. Es el lugar natural porque es un ajuste del builder, no del tablero.
  - `<label>` con `<input type="checkbox">` + texto **«No permitir forzar»**.
  - Estado: **marcado por defecto** (= comportamiento actual, sin cambios).
  - `data-testid="horario-forzar-checkbox"`.
- **Al desmarcar** (pasar de «no permitir» a «sí permitir forzar»): se abre el **modal de advertencia**.
  - `Modal` (`src/components/ui/Modal.tsx`) con `title` de advertencia y **footer con un único botón
    «Cerrar»** (no hay «Cancelar»/«Confirmar», no hay `ConfirmDialog`).
  - `data-testid="horario-forzar-aviso"` (prop `testId` del `Modal`).
  - Botón `data-testid="horario-forzar-aviso-cerrar"`, `className="btn btn--ghost"`, cierra con
    `onClose`/`useDismiss` como el resto de modales.
  - Texto de advertencia: el sistema ahora **permitirá forzar** los horarios; se podrá poner **al mismo
    maestro en varias secciones a la misma hora**. El conflicto de **sección** sigue bloqueado.
- **Al volver a marcar** («No permitir forzar» marcado): se restaura el bloqueo **sin** mostrar aviso
  (no hace falta confirmar volver al comportamiento seguro).
- **Sin degradados**: usar tokens/colores sólidos (REG-UI-01). El modal reusa las clases existentes
  del design system (`modal__footer`, `texto-muted`, `btn`).

---

## 4. Archivos a tocar

| Archivo | Cambio |
|---|---|
| `src/routes/_app/horarios.tsx` | (1) Estado `permitirForzar` (default `false`) y `avisoForzar` (default `false`). (2) En `resetWizardState` resetear ambos a `false`. (3) Checkbox **«No permitir forzar»** en el footer del `<Modal board>` junto a «Activar al guardar»; al desmarcar (`setPermitirForzar(true)`) abrir `setAvisoForzar(true)`; al marcar (`setPermitirForzar(false)`) no mostrar aviso. (4) `<Modal>` de advertencia con un solo botón «Cerrar». (5) Pasar `permitirForzar={permitirForzar}` a `<HorarioBoard>`. |
| `src/components/horarios/HorarioBoard.tsx` | (1) Nueva prop `permitirForzar?: boolean` en `HorarioBoardProps` (default `false`). (2) En `isPlaceable` (~145-154): aplicar el chequeo de **maestro** solo si `!permitirForzar`; el de **sección** siempre. (3) En `placeableIds` (~156-177): al resaltar celdas, ignorar `maestroBusy` si `permitirForzar` (el `secBusy` sigue filtrando). (4) En `onDropCell` (~209-288): la rama de conflicto de maestro ya no se alcanza cuando `permitirForzar` (porque `isPlaceable` devuelve `true`); el mensaje de error se mantiene para el caso sección. Sin cambiar el resto del flujo de colocar/mover. |

Notas de implementación:

- `isPlaceable` es la fuente única de verdad para colocar **y** mover (ambos la usan). Con el
  `permitirForzar` dentro de ella, **colocar** (rama `pill`) y **mover** (rama `placed`) quedan cubiertos
  por la misma regla sin lógica duplicada.
- `placeableIds` debe respetar `permitirForzar` para que el **resaltado de celdas al hacer foco** sea
  coherente con lo que realmente se puede soltar (evita el pill «apagado» cuando sí se puede forzar).
  Añadir `permitirForzar` a las dependencias de ese `useMemo`.
- El chequeo de **sección** (`b.seccionId === pill.seccionId && …`) **no se toca** en ningún caso.
- El mensaje de error de sección existente se conserva tal cual.
- No se modifica `slotsFromPlaced` ni `placedFromPreviewSlots` (la persistencia no cambia).

### Contratos / tipos

- `HorarioBoardProps` (local al componente): se agrega `permitirForzar?: boolean`.
- No hay cambios en `src/services/horarios.ts`, DTOs, ni contratos con el backend.

---

## 5. Reglas aplicadas (REG-UI)

- **REG-UI-01** (paleta con tokens y **sin degradados**): el nuevo checkbox y el modal de advertencia
  usan tokens y clases existentes; nada de `*-gradient`.
- **REG-UI-04** (formularios/acciones en modal con confirmación): el aviso al habilitar el forzado se
  presenta en un `Modal` (footer solo «Cerrar»), consistente con el patrón del proyecto.
- **REG-UI-10** (animación de modales): el aviso usa el `Modal` estándar (ya trae la animación/`useDismiss`).
- **REG-UI-05** (toasts abajo a la derecha): se conserva el toast actual de conflicto para el caso sección.
- **REG-UI-08** (wizard para formularios largos): el ajuste vive dentro del wizard de armado (paso
  «Tablero»), sin alterar la navegación `Datos → Recreo → Tablero`.

---

## 6. Tests

- `pnpm generate-routes` (no hay rutas nuevas; se corre para validar el árbol).
- `tsc --noEmit`.
- `eslint`.
- **e2e (Playwright) — opcional**: hoy no hay `horarios.spec.ts` (existe `horario-maestro.spec.ts`,
  que es la vista del maestro). Si se agrega cobertura, un caso nuevo debe:
  1. Abrir el panel manual (wizard, paso Tablero).
  2. Verificar `horario-forzar-checkbox` **marcado** por defecto y que **soltar** una pill que choque de
     maestro **no** la coloca (toast de conflicto de maestro).
  3. Desmarcar → aparece `horario-forzar-aviso` con **un solo** botón «Cerrar»; cerrarlo.
  4. Volver a soltar → ahora **sí** se coloca (conflicto de maestro forzado).
  5. Intentar un choque de **sección** → sigue bloqueado.
  - Requiere backend + DB local; si no están, se documenta como no ejecutable.

---

## 7. Cierre

- Al terminar, **preguntar** si se actualiza el **MAPA** de frontend
  (`sasha_fronted/documentacion/MAPA.md`) y si se marcan las notas del **vault**
  (`Trabajo/Paneles`, `Trabajo/Tareas`, `Trabajo/Sesiones`). **No editar MAPA ni vault en silencio.**
- Registrar como `DEC-`/`CON-` del vault la decisión «permitir forzar choque de maestro por sesión de
  armado, sin persistir y sin tocar el generador automático» cuando se implemente.
- **No requiere backend ni migración.** Confirmado: solo se toca `sasha_fronted/`; no hay endpoints,
  permisos, tablas ni seed nuevos.
