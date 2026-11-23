# Modos institucionales y prematrícula — Frontend

## Objetivo
Implementar en la web los modos Normal, Cierre de período y Prematrícula; los flujos autenticados de responsable/alumno; la página pública de prematrícula y consulta de estado; y la revisión administrativa. La app móvil queda fuera de alcance.

## Requisitos acordados
- Admin configura modo, activación independiente de la página pública y fechas de inicio/fin.
- Los modos cambian los accesos y vistas web de responsables y alumnos. Cierre muestra el acceso a calificaciones; prematrícula permite nuevo ingreso y reingreso.
- Reingreso usa el resultado académico calculado por backend (promoción/repetición y retrasadas); el responsable elige uno de sus hijos, revisa datos y propuesta, puede dejar observación opcional y adjunta recibo.
- Nuevo ingreso recoge los datos requeridos y recibo de pago; no crea cuentas, carnés, fichas ni matrícula definitiva antes de aprobación.
- Personal con roles admin, admin_temporal, director, consejería o admisiones revisa solicitudes en una página estilo registros, puede ver/editar/eliminar y aprobar o denegar. Denegar exige motivo.
- La página pública muestra institución, marca Sasha y logo institucional. Permite iniciar prematrícula y consultar estado mediante código único. Estados: pendiente, aprobada y denegada; la denegación muestra motivo y permite corregir/reenvíar la misma solicitud conservando el código.
- El recibo puede abrirse en pantalla completa, ampliar y descargarse.

## Diseño y contratos
- Consumir configuración/modo, catálogos, flujo de prematrícula, revisión, consulta pública y carga de recibos desde APIs del backend; el backend define los contratos autoritativos.
- Rutas sugeridas: administración bajo configuración/modos; portal público bajo `/prematricula`; revisión en `/prematriculas` con permisos.
- Mantener patrón de servicios, TanStack Query y rutas del proyecto. Vistas de registros siguen REG-UI-12; sin degradados.
- No crear usuario ni ejecutar generación ZIP en el navegador durante el envío inicial. Tras aprobación, integrarse con el flujo existente de matrícula/documentos según contrato backend.

## Aceptación
1. Admin configura y activa/desactiva modos, fechas y página pública separadamente.
2. Se aplican las vistas/accesos correspondientes a cada modo en web.
3. Responsable crea nuevo ingreso o reingreso con recibo; recibe código y puede consultar estado sin autenticación.
4. Solicitud denegada muestra motivo, permite corregir y reenviar preservando identidad/código.
5. Personal autorizado revisa y aprueba/deniega; motivo obligatorio al denegar; roles no autorizados no acceden.
6. La aprobación inicia la matrícula final y la generación de entregables existentes.
7. El recibo tiene visor con zoom, pantalla completa y descarga.

## Casos borde
- Fecha final anterior a inicial; modo fuera de ventana; página pública habilitada sin modo; solicitud duplicada por alumno/periodo; archivo inválido o fallo de carga; doble aprobación concurrente; denegación sin motivo; consulta con código inválido; reingreso sin resultado final disponible; estudiante sin responsable vinculado.

## Fuera de alcance
App móvil, cambios de promoción académica, pagos en línea, creación de usuarios públicos y aprobación por responsable.

## Dependencias
Contrato backend spec 026 y migración/seed de datos spec db 005. Reutiliza promoción y documentos de matrícula existentes. MAPA frontend se actualizará tras implementar, previa confirmación según AGENTS.
