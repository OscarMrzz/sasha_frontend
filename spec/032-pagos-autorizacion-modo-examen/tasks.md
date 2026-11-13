# Tareas: Pagos y autorización por mora en modo examen

**Estado:** implementación y verificaciones frontend/backend completadas.

**Dependencia:** completar el contrato, la migración y los endpoints definidos en `backend_sasha/spec/025-autorizacion-mora-examen/tasks.md` antes de integrar el servicio frontend de autorización.

## Fase 1: Flujos frontend

- [x] 1.1 Extraer el formulario de registro de pago como componente reutilizable.
- [x] 1.2 Extraer visor y formulario de validación de recibo como componentes reutilizables.
- [x] 1.3 Mantener Caja conectada a los componentes extraídos.
- [x] 1.4 Verificar que los flujos existentes de Caja conservan registro y validación.
- [x] 1.5 Añadir query del contador de recibos sin revisar con clave propia.
- [x] 1.6 Añadir botón Pagos en Semana y Ahora solo al admin.
- [x] 1.7 Mostrar acciones Revisar y Registrar según permisos activos.
- [x] 1.8 Añadir modal de recibos pendientes, visor, validación y refresco manual.
- [x] 1.9 Añadir apertura del formulario de registrar pago desde el modo examen.
- [x] 1.10 Añadir servicio frontend para habilitar/deshabilitar autorización.
- [x] 1.11 Añadir estado y acción rápida confirmada a las tarjetas del admin.
- [x] 1.12 Añadir lista separada de morosos autorizados al panel del maestro.
- [x] 1.13 Añadir lista separada de morosos autorizados al panel de supervisión staff.
- [x] 1.14 Refrescar contador/listas tras pagos y Ahora tras cambios relevantes, sin polling.
- [x] 1.15 Adaptar controles y modales para PC y móvil.

## Fase 2: Verificación y cierre

- [x] 2.1 Cubrir permisos de revisión/registro y rol admin para autorización.
- [x] 2.2 Cubrir aislamiento de autorizaciones entre exámenes.
- [x] 2.3 Cubrir que autorización aparece en maestro y supervisión sin salir del alcance permitido.
- [x] 2.4 Cubrir que recibo sin revisar o pago parcial no oculta mora.
- [x] 2.5 Cubrir que un pago confirmado que resuelve mora elimina al alumno de ambas listas.
- [x] 2.6 Cubrir que el contador se actualiza tras revisar recibos y al refrescar la lista de nuevos comprobantes.
- [x] 2.7 Verificar que revisar recibos y registrar pagos mantiene al admin dentro del modo examen.
- [x] 2.8 Verificar usabilidad responsive de modales y acciones rápidas en móvil.
- [x] 2.9 Verificar que Caja conserva sus flujos tras extraer componentes.
- [x] 2.10 Ejecutar y registrar verificaciones estáticas disponibles.
- [x] 2.11 Actualizar el MAPA frontend y cerrar checklist solo con trabajo verificado.
- [x] 2.12 Ejecutar E2E cuando PostgreSQL de pruebas esté disponible.

## Verificación en curso

- `pnpm exec tsc --noEmit`, ESLint, `pnpm build` y `git diff --check`: PASS.
- E2E de modo examen: 3/3 PASS, incluyendo admin en PC, admin a 390 px y supervisor a 390 px.
- El E2E de admin verifica que un recibo nuevo aparezca tras pulsar **Actualizar** y que el contador cambie.
- Regresión de Caja y recibos: 8/8 PASS (`pagos.spec.ts` 4/4, `recibos.spec.ts` 4/4).
- Backend de integración: PASS contra `molde_test`, aislada de `molde_db`.
- Se actualizó `recibos.spec.ts` para usar la etiqueta del concepto y las secciones/estados actuales; el fixture E2E de modo examen usa fecha dinámica.
- Se actualizaron `documentacion/MAPA.md` de frontend y backend con el flujo y el contrato de autorización por examen.
