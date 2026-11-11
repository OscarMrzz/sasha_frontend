# Checklist de tareas: Modo examen para personal - Frontend

**Estado:** implementación verificada; MAPA pendiente de consulta al usuario. `admin_temporal` queda fuera; el modo staff es solo lectura y no amplía permisos ni la autorización del backend; supervisión compartida aparece una sola vez con todos sus responsables.

**Dependencia:** iniciar consumo de endpoints después de aprobar y completar el contrato/autorización backend (backend tareas 1.1–1.4); iniciar la integración de vistas después de disponer de las consultas y filtros de alcance (backend tareas 2.1–2.7).

## Fase 1: Tipos, rutas y navegación

- [x] Tarea 1.1: Confirmar roles visibles y consulta staff de solo lectura, sin asistencia ni reportes.
- [x] Tarea 1.2: Añadir los servicios y tipos para los endpoints staff de Semana y Ahora, separados de las claves de caché del maestro.
- [x] Tarea 1.3: Crear la ruta padre de Modo examen con vista Semana y la ruta hija Ahora.
- [x] Tarea 1.4: Añadir entrada y salida del modo desde la navegación, AppShell y command palette solo para los roles acordados.
- [x] Tarea 1.5: Actualizar el árbol de rutas generado mediante las herramientas del proyecto.

## Fase 2: Integración de vistas y datos

- [x] Tarea 2.1: Reutilizar la vista semanal del maestro con el conjunto ya autorizado por backend y filtros locales de grado, sección y fecha.
- [x] Tarea 2.2: Implementar agrupación determinista por supervisor(es) y sección sin duplicar `examen_asignacion_id`.
- [x] Tarea 2.3: Mostrar exámenes sin responsable bajo el estado explícito “Sin maestro responsable asignado”.
- [x] Tarea 2.4: Renderizar la vista Ahora con pagos informativos y solo lectura explícita para todos los roles staff; mantener intactas las acciones del modo maestro.
- [x] Tarea 2.5: Configurar una clave de query estable; consultar al entrar y una vez por cada pulsación de **Ahora**, usando la hora local al ejecutar la petición.
- [x] Tarea 2.6: Desactivar polling, refresco por foco/reconexión y cualquier actualización automática de la clave ligada al reloj.
- [x] Tarea 2.7: Mantener cronómetro, umbral de cinco minutos, aviso final y sonido en temporizadores locales; una alerta nunca debe llamar al backend.
- [x] Tarea 2.8: Respetar el alcance de coordinador recibido del backend; no ofrecer acciones frontend que amplíen ese alcance.
- [x] Tarea 2.9: Implementar estados vacíos, error recuperable y hora de la instantánea, sin reintentos que creen peticiones automáticas.
- [x] Tarea 2.10: Aplicar tokens sólidos, diseño responsivo y sin degradados al encabezado de supervisor y sus secciones.

## Fase 3: Pruebas, casos borde y validación

- [x] Tarea 3.1: Cubrir navegación y acceso permitido/denegado para Director, Consejería, Admin y Coordinador. E2E parametrizado de entrada, Semana, Ahora y salida para los cuatro roles; denegación cubierta por unitarias de allowlist.
- [x] Tarea 3.2: Cubrir la agrupación de un maestro con varias secciones, supervisión compartida y examen sin responsable.
- [x] Tarea 3.3: Cubrir una única carga inicial y una única consulta al pulsar **Ahora**, también tras avanzar reloj, cambiar foco o recuperar red.
- [x] Tarea 3.4: Cubrir que el contador y las alertas avanzan localmente y persisten sin nuevas respuestas del backend.
- [x] Tarea 3.5: Cubrir los límites de coordinador sin reglas y las listas autorizadas sin datos ajenos.
- [x] Tarea 3.6: Ejecutar verificaciones frontend acordadas y registrar resultados antes de cerrar la tarea.

## Fase 4: Documentación y cierre

- [ ] Tarea 4.1: Preguntar si se actualiza el MAPA del frontend.
- [x] Tarea 4.2: Actualizar el checklist de implementación solo con tareas verificadas y aprobadas.

## Verificación de implementación

- `pnpm generate-routes`: completado.
- Unitarias de agrupación y roles: 4/4 pasaron.
- ESLint de archivos tocados y `git diff --check`: correctos.
- `tsc --noEmit`: correcto tras explicitar el tipo `AlertaPendiente` del `flatMap` reutilizado por ambas vistas; sin cambio de lógica de alertas.
- E2E `pnpm exec playwright test src/tests/e2e/supervision-examenes.spec.ts --reporter=list`: 5/5 pasaron; navegación por los cuatro roles, consulta manual, solo lectura Admin y alertas locales. Solo se recreó `molde_test`.
