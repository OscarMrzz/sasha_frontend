# Plan: Pagos y autorización por mora en modo examen

- **ID:** 032-pagos-autorizacion-modo-examen
- **Estado:** propuesta para aprobación
- **Relacionado:** `backend_sasha/spec/025-autorizacion-mora-examen/plan.md`

## Objetivo

Permitir al admin atender recibos y registrar pagos desde el modo de exámenes, y conceder por alumno y examen una excepción visible para supervisores mientras el alumno continúe con pagos bloqueantes pendientes.

## Alcance y criterios de aceptación

- En Semana y Ahora, el rol activo `admin` ve **Pagos** con el conteo de recibos `sin_revisar`.
- Desde Pagos puede abrir la revisión de recibos pendientes o el registro de pago, sin abandonar el modo examen. Cada acción respeta sus permisos activos `pagos:put` y `pagos:post`.
- La revisión permite ver comprobante y completar el flujo existente. Registrar pago reutiliza el formulario y sus conceptos actuales.
- En Ahora, cada tarjeta morosa permite al admin **Habilitar rápido** / **Deshabilitar rápido**. Habilitar requiere confirmación: «Este alumno seguirá en mora, pero tendrá permiso especial para hacer este examen. ¿Estás seguro?».
- La autorización queda ligada al par examen/alumno; no cambia deuda, asistencia, calificaciones ni otros exámenes. El admin conserva al alumno en su grupo de morosos mientras la deuda siga bloqueando.
- Maestro supervisor y personal autorizado ven un grupo separado **Alumnos con mora autorizados a hacer examen**. Una autorización solo aparece junto a la mora vigente de ese alumno y examen; al resolverse los pagos bloqueantes desaparece de ambas listas.
- Tras registrar un pago o validar un recibo, la vista del admin actualiza pagos, contador y Ahora para retirar alumnos que dejaron de tener mora.
- Los cambios de otros usuarios se reflejan al entrar o usar la actualización manual. No agregar polling, actualización por foco/reconexión ni consultas activadas por temporizadores.
- Interfaz y diálogos usables en PC y móvil, con acciones táctiles visibles y contenido desplazable en pantallas pequeñas.

## Diseño y arquitectura

- Reutilizar `listRecibos('sin_revisar')`, `validarRecibo`, el formulario existente de cobro y `ExamenAlumnoCard`; extraer componentes compartidos de Caja solo si es necesario para evitar duplicar protocolo.
- Añadir servicio frontend para el endpoint de autorización y ampliar el DTO de Ahora con `autorizado_examen`.
- El backend autoriza la escritura solo para rol activo admin, valida que alumno y examen pertenecen al mismo periodo/sección y comprueba mora actual antes de habilitar. El frontend nunca es autoridad del alcance.
- El backend devuelve las autorizaciones intersectadas con la consulta vigente de pagos bloqueantes tanto en Ahora maestro como en Ahora staff.
- Contar recibos al entrar/abrir Pagos y refrescar después de mutaciones; sin temporizador. Mantener el botón manual Ahora y actualizar una vez tras cambios de pago o autorización.
- Dirección visual Sasha existente, tokens sólidos, sin degradados ni nuevos paquetes.

## Casos límite

- Sin recibos pendientes; sin permiso para una de las acciones de pago; recibo ya revisado desde otra sesión.
- Recibo sin revisar no limpia la mora. Pago parcial o de otro concepto tampoco la limpia si permanecen obligaciones bloqueantes.
- Pago aprobado que resuelve mora elimina al alumno de ambas listas; una anulación posterior vuelve a reflejar la mora y el estado persistido de autorización.
- Doble clic/reintento no crea filas duplicadas ni auditorías duplicadas; alumno trasladado o sin matrícula compatible no puede autorizarse.
- Autorización en un examen no afecta otro examen de la misma sección.
- Error de red conserva el último estado confirmado y presenta el mensaje estándar.

## Verificación prevista

Frontend: verificar permisos y acciones de pago, contador, validación/registro sin salir del modo, autorización reversible, agrupación separada, desaparición al resolver mora, aislamiento por examen y responsive. Ejecutar verificaciones después de implementar y anotar resultados en `tasks.md`.

## Documentación

La implementación modifica comportamiento de `/modo-examen` y `/modo-examen/ahora`; al terminar se consultará si actualizar el MAPA frontend y el contrato del backend. No hacer commit ni push sin solicitud explícita.
