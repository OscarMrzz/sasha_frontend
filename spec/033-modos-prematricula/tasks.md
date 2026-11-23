# Tareas — Frontend 033

- [x] Revisar rutas, permisos, servicios y componentes actuales de matrícula, portal y configuración.
- [x] Integrar contratos API de configuración de modos y activación de página pública.
- [x] Crear interfaz de gestión de modos, fechas y disponibilidad pública.
- [x] Aplicar modo a navegación y pantallas web de alumno/responsable.
- [x] Crear flujo público: nuevo ingreso, reingreso con resultado académico, recibo y observación opcional.
- [x] Crear consulta pública por código y recuperación/corrección de solicitudes denegadas.
- [x] Crear tabla de prematrículas para roles autorizados con acciones y estados.
- [x] Crear revisión de solicitud, visor de recibo, edición, aprobación y denegación con motivo.
- [x] Enlazar aprobación con matrícula final y descarga de documentos existentes.
- [ ] Añadir pruebas de componentes/e2e de escenarios acordados y ejecutar lint/build/tests relevantes.
- [ ] Actualizar MAPA frontend tras completar implementación y autorización.

## Verificación de implementación

- Rutas generadas con `pnpm generate-routes`.
- Comprobación de tipos `pnpm exec tsc --noEmit`: correcta.
- ESLint sobre los archivos nuevos: correcto tras corregir encadenamientos opcionales innecesarios.
- `pnpm build`: correcto (cliente + SSR/Nitro); advertencia de tamaño de chunks existente.
- Pruebas no añadidas ni ejecutadas, siguiendo la instrucción de la sesión.
- MAPA pendiente de autorización del usuario.
