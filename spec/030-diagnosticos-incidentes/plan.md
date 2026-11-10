# Plan · Frontend · Diagnósticos de incidentes

- **ID:** 030-diagnosticos-incidentes
- **Capa:** React/TanStack Start (`sasha_fronted`)
- **Relacionadas:** `backend_sasha/spec/022-diagnosticos-incidentes`, `db_sasha/spec/004-diagnosticos-incidentes`, `sasha_master/spec/002-diagnosticos-incidentes`
- **Estado:** implementado; cobertura de integración HTTP/IndexedDB nativo pendiente

## Objetivo y alcance

Capturar automáticamente fallos que el usuario recibe mediante `apiRequest`, incluyendo 429 al iniciar sesión, sin depender de una sesión autenticada. Distinguir respuesta HTTP de fallo de red/timeout. Enviar solo eventos saneados al endpoint diagnóstico del backend y conservar pendientes en IndexedDB cuando el envío falle.

## Diseño

- Extender el punto común `src/lib/api.ts` para crear un evento por respuesta 429/5xx y los demás errores visibles definidos por el contrato; fallo de red conserva `status` ausente y tipo acotado.
- Campos allowlist enviados: `event_id`, timestamp, método, ruta sin query y segmentos dinámicos redactados, status opcional, code de error con forma permitida, `request_id` solo si es UUID, duración, `Retry-After` y versión/build opcional. No envía identidad cliente/entorno ni mensaje libre: Master atribuye cliente/entorno desde la base remota y su configuración. No serializar `ApiError.body`, cuerpos de request, headers generales o stack.
- Cola IndexedDB pequeña y con caducidad, reintento con backoff/jitter y deduplicación. No bloquear, retrasar ni alterar la acción original del usuario. Purgar al confirmarse la ingesta o vencer la retención local.
- Envío al endpoint público `POST /diagnosticos/eventos`; excluir esa ruta de la auto-captura para evitar bucles. Ante otra respuesta 429 mantener en cola y respetar `Retry-After` con tope.
- No mostrar toast nuevo ni enviar datos personales; los mensajes existentes al usuario permanecen.

Límites iniciales propuestos para revisión: IndexedDB guarda como máximo 500 eventos o 2 MiB durante 7 días; cada evento tiene tamaño máximo estricto. Reintentos usan backoff/jitter y tope de `Retry-After`.

## Criterios de aceptación

- Un 429 durante `POST /login/` genera evento aunque no haya sesión.
- El evento incluye request ID UUID y `Retry-After` si se reciben; los fallos de red quedan diferenciados sin inventar status. IDs de request con otros formatos se omiten en v1.
- Si el API de telemetría no está disponible, el evento se reintenta después sin repetir la operación original ni duplicarse en servidor.
- Un fallo al reportar telemetría nunca reemplaza ni oculta el error original.
- Pruebas cubren 429 login, 500, error de red, reintento, deduplicación, expiración y redacción de datos.

## Dependencias y límites

Depende del contrato/ingesta backend `022` y migración `082`. La cola vive en el navegador, no en el escritorio; Master puede ver el evento tras su sincronización. Una denegación edge que no llegue al proceso frontend se captura solo si el navegador recibe una respuesta HTTP y el cliente puede ejecutar JavaScript.
