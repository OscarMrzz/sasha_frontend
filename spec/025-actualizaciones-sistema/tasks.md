# Checklist de Tareas: Actualizaciones del sistema — Frontend

> Feature `025-actualizaciones-sistema` · Capa **frontend** (`sasha_fronted/`) · React 19 + TanStack Start.
> Origen: `sasha_fronted/spec/025-actualizaciones-sistema/plan.md`.
> Contrato autoritativo: `backend_sasha/spec/017-actualizaciones-sistema/plan.md`.
> Convención: cada `- [ ]` es una tarea verificable. Marcar `- [x]` solo al completarla y comprobarla.
> Reglas fijas: sin degradados; solo tokens `--sasha-*`; buscador «Buscar…» (REG-UI-11); permisos con `Can`/`useCan`;
> el frontend no decide permisos del backend.

## Estado de implementación (2026-11-04)

> Implementado y probado. Las casillas de abajo quedan como referencia del plan; este bloque manda.

| Fase | Estado |
|---|---|
| 0. Preflight | **Hecha** |
| 1. Servicio, tipos y helpers | **Hecha** (`services/actualizaciones.ts`, `helpers/actualizaciones.ts`) |
| 2. Permisos, nav e icono | **Hecha** (`adminPerms`, `developer`, `NAV_ITEMS`, `megaphone`) |
| 3. Card y estilos | **Hecha** (cards con botones Editar/Eliminar; `RowMenu` se descartó por inestabilidad) |
| 4. Página, agrupación, filtros y contadores | **Hecha** (`/actualizaciones`, 4 grupos, buscador y chips) |
| 5. CRUD del developer | **Hecha** (modal con los 7 campos y confirmación de descarte) |
| 6. Estados de carga, vacío y error | **Hecha** |
| 7. Command palette | **Hecha** |
| 8. E2E | **Hecha**: `actualizaciones.spec.ts` **6/6** |
| 9. Verificación | **Hecha** (`tsc`, `eslint` de archivos tocados, `pnpm build`) |
| 10. Documentación | MAPA pendiente de aprobación del usuario |

- Incidencia corregida en el camino: al crear y editar seguido se reutilizaba la instancia del modal; se resolvió con `key` por actualización.
- También se corrigieron dos bugs reales de `RowMenu` (se cerraba en el acto y se salía del viewport) aunque esta feature ya no lo usa.

## Resumen de fases

| Fase | Qué hace | Depende de |
|---|---|---|
| 0 | Preflight (skills y patrones) | — |
| 1 | Servicio, tipos y helpers | Backend 017 |
| 2 | Permisos, nav e icono | 1 |
| 3 | Card y estilos | 1 |
| 4 | Página, agrupación, filtros y contadores | 2, 3 |
| 5 | CRUD del developer (modal y confirmación) | 4 |
| 6 | Estados de carga, vacío y error | 4 |
| 7 | Command palette | 2 |
| 8 | E2E | 5, backend + fixture |
| 9 | Verificación | 8 |
| 10 | Documentación | 9 |

---

## Fase 0: Preflight

- [ ] 0.1 Correr `pnpm dlx @tanstack/intent@latest list` y cargar la skill local que aplique antes de editar.
- [ ] 0.2 Leer `sasha_fronted/AGENTS.md`, `documentacion/MAPA.md` y `Zettels/REG-UI-12`/`REG-UI-13`.
- [ ] 0.3 Revisar `src/routes/_app/excusas/tipos.tsx` (molde de página con permiso, modal y mutaciones).
- [ ] 0.4 Revisar `src/components/ui/SearchInput.tsx`, `Modal.tsx`, `Field.tsx` y `ConfirmDialog.tsx`.
- [ ] 0.5 Revisar `src/helpers/nav.ts`, `nav-icons.tsx`, `permissions.ts` y `command-palette.ts`.

## Fase 1: Servicio, tipos y helpers

- [ ] 1.1 Crear `src/services/actualizaciones.ts` con `EstadoActualizacion`, `ActualizacionSistema`, `ActualizacionInput` y las 4 funciones (`listActualizaciones`, `crearActualizacion`, `actualizarActualizacion`, `eliminarActualizacion`).
- [ ] 1.2 Implementar `GET /actualizaciones/` con `apiRequestList<ActualizacionSistema>`.
- [ ] 1.3 Implementar `POST`, `PUT` y `DELETE` con `apiRequest`, devolviendo los tipos correctos.
- [ ] 1.4 Crear `src/helpers/actualizaciones.ts` con `ESTADOS_ACTUALIZACION` (código, etiqueta, orden), `etiquetaEstado`, `formatearFecha`, `agruparYOrdenar` y `validarActualizacion`.
- [ ] 1.5 `agruparYOrdenar`: grupo por etapa en orden de roadmap; dentro del grupo `fecha DESC`, `orden ASC`, `created_at DESC`; sin grupos vacíos.
- [ ] 1.6 `validarActualizacion`: título 1..160, descripción 1..4000, estado válido, orden `>= 0`, versión <= 40, módulo <= 80.
- [ ] 1.7 Centralizar la query key `['actualizaciones']` y el helper de invalidación.

## Fase 2: Permisos, navegación e icono

- [ ] 2.1 Agregar `'actualizaciones:get'` a `adminPerms` en `src/helpers/permissions.ts`.
- [ ] 2.2 Agregar `'actualizaciones:get'`, `'actualizaciones:post'`, `'actualizaciones:put'` y `'actualizaciones:delete'` a `developer`.
- [ ] 2.3 Agregar el ítem `{ to: '/actualizaciones', label: 'Actualizaciones', permission: 'actualizaciones:get', icon: 'megaphone' }` en `NAV_ITEMS`, antes de «Auditoría».
- [ ] 2.4 Registrar el icono `megaphone` en `nav-icons.tsx`.
- [ ] 2.5 Agregar la ruta a `DESCRIPCION_RUTA` y `PALABRAS_CLAVE_RUTA` en `src/helpers/command-palette.ts`.

## Fase 3: Card y estilos

- [ ] 3.1 Crear `src/components/actualizaciones/ActualizacionCard.tsx` con título, módulo, versión, descripción recortada, fecha y estado neutro.
- [ ] 3.2 Incluir botones Editar/Eliminar en el pie de la card solo cuando `can('actualizaciones:put')`/`can('actualizaciones:delete')`.
- [ ] 3.3 Agregar las clases `.actualizaciones__grid`, `.actualizacion-card`, `.actualizacion-card__head`, `.actualizacion-card__desc`, `.actualizacion-card__meta` y `.actualizacion-card__estado` en `style1.css` con tokens.
- [ ] 3.4 Ajustar la piel en `style2.css` si hace falta; prohibido usar degradados y colores por estado.
- [ ] 3.5 Verificar responsive 3/2/1 columnas (escritorio, tablet, móvil).

## Fase 4: Página, agrupación, filtros y contadores

- [ ] 4.1 Crear `src/routes/_app/actualizaciones.tsx` con `createFileRoute('/_app/actualizaciones')` y `RequirePermission permission="actualizaciones:get"`.
- [ ] 4.2 `useQuery` con `queryKey: ['actualizaciones']` y `queryFn: listActualizaciones`.
- [ ] 4.3 Encabezado con título, subtítulo y contador por estado.
- [ ] 4.4 Botón «Agregar actualización» solo con `can('actualizaciones:post')`.
- [ ] 4.5 `SearchInput` con placeholder «Buscar…» filtrando título, descripción y módulo.
- [ ] 4.6 Chips de estado (Todos + 4) de selección única, con `data-testid="actualizaciones-filtro-{estado}"`.
- [ ] 4.7 Renderizar grupos con encabezado y conteo, respetando `agruparYOrdenar`.
- [ ] 4.8 Aplicar `data-testid="actualizaciones-page"` y los testids del plan §9.

## Fase 5: CRUD del developer

- [ ] 5.1 Crear `src/components/actualizaciones/ActualizacionFormModal.tsx` con los 7 campos del plan §8.
- [ ] 5.2 Validar en cliente con `validarActualizacion` y mostrar errores por campo.
- [ ] 5.3 Alta con `useMutation` + toast + invalidación de `['actualizaciones']`.
- [ ] 5.4 Edición precargando la card seleccionada y `PUT` parcial/completo.
- [ ] 5.5 Eliminar con `ConfirmDialog` en modo peligro y `DELETE`.
- [ ] 5.6 Confirmar descarte al cerrar el modal con cambios sin guardar.

## Fase 6: Estados de carga, vacío y error

- [ ] 6.1 Skeletons de card durante la carga.
- [ ] 6.2 Vacío para admin/ADT: «Todavía no hay actualizaciones».
- [ ] 6.3 Vacío para developer con botón «Agregar la primera».
- [ ] 6.4 Error con botón «Reintentar».
- [ ] 6.5 Sin resultados de búsqueda: «No hay actualizaciones que coincidan».

## Fase 7: Command palette

- [ ] 7.1 Verificar que Ctrl+K encuentra «Actualizaciones» y navega a `/actualizaciones`.

## Fase 8: E2E

- [ ] 8.1 Crear `src/tests/e2e/actualizaciones.spec.ts` con `loginAs`.
- [ ] 8.2 Caso admin (`1002026100`): ve cards, no ve «Agregar» ni acciones.
- [ ] 8.3 Caso admin temporal (`1002026608`): igual que admin.
- [ ] 8.4 Caso developer: crear, editar y eliminar una actualización propia (título único) y limpiar al final.
- [ ] 8.5 Caso orden: primer grupo «Pendiente» y fecha más reciente arriba dentro del grupo.
- [ ] 8.6 Caso filtro y búsqueda con admin.
- [ ] 8.7 Caso rol sin permiso (maestro): no aparece el ítem en `.sidebar-nav`.

## Fase 9: Verificación

- [ ] 9.1 `pnpm tsc --noEmit` (o el script equivalente del repo).
- [ ] 9.2 `pnpm lint`.
- [ ] 9.3 `pnpm build`.
- [ ] 9.4 `pnpm test:e2e -- actualizaciones.spec.ts` y reportar PASS/FAIL.
- [ ] 9.5 Revisar regresión visual en móvil (1 columna) y sin degradados.

## Fase 10: Documentación

- [ ] 10.1 Actualizar `sasha_fronted/documentacion/MAPA.md` solo si el usuario lo aprueba.
- [ ] 10.2 Registrar en el vault la bitácora de `TAR-038` al terminar.

---

## Criterio de cierre

- [ ] Página visible para admin, admin temporal y developer; invisible para el resto.
- [ ] Admin/ADT solo lectura; developer CRUD completo.
- [ ] Agrupación por etapa + fecha, buscador, filtros y contadores funcionando.
- [ ] Sin degradados ni colores de estado.
- [ ] E2E de los 6 casos en verde y `build` limpio.
- [ ] El usuario confirmó si se actualiza el MAPA.
