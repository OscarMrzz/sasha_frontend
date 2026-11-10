# Checklist de Tareas: Diagnósticos de incidentes - Frontend

Implementación terminada para la cola y captura común. `pnpm exec playwright test --config=playwright.unit.config.ts`: 9/9 pasaron. El chequeo global TypeScript sigue bloqueado por un error previo en `src/components/examenes/ExamenAhoraAlertas.tsx:197`.

## Fase 1: Contrato, modelos y cola
- [x] Tarea 1.1: Alinear contrato de incidente y límites con backend `022` y DB `004`.
- [x] Tarea 1.2: Definir modelo FE allowlist con ID idempotente, build opcional, timestamp, method/path, status/code, request ID y Retry-After; cliente/entorno se atribuyen desde la base remota y el target de Master.
- [x] Tarea 1.3: Implementar persistencia IndexedDB con límite de cantidad/tamaño, expiración y versionado del esquema local.
- [x] Tarea 1.4: Implementar normalización de path eliminando query y sustituyendo segmentos ajenos a la allowlist estática por `:id`.

## Fase 2: Captura y entrega
- [x] Tarea 2.1: Integrar captura en `apiRequest` para 400–599 excepto 401/403 esperados, incluso durante login sin sesión.
- [x] Tarea 2.2: Capturar TypeError de red y timeout con status ausente, excluyendo cancelaciones AbortError.
- [x] Tarea 2.3: Enviar evento saneado al endpoint `POST /diagnosticos/eventos` sin modificar el resultado ni el mensaje original al usuario.
- [x] Tarea 2.4: Excluir el endpoint de telemetría de la auto-captura para prevenir recursión, con y sin prefijo `/api`.
- [x] Tarea 2.5: Reintentar con backoff/jitter y respetar Retry-After con tope; borrar tras ACK válido, expiración o cupo local documentado.
- [x] Tarea 2.6: Aplicar deduplicación local y conservar event_id estable entre reintentos.
- [x] Tarea 2.7: Reconstruir la allowlist antes de persistir/enviar; code restringido a identificadores de error y request_id a UUID, sin body, payloads, headers generales ni stack.

## Fase 3: Integración y privacidad
- [x] Tarea 3.1: Obtener build de configuración pública opcional; no enviar identidad cliente/entorno desde el navegador.
- [ ] Tarea 3.2: Verificar funcionamiento tras cambio de cliente/deployment y ausencia de datos personales identificables.
- [x] Tarea 3.3: Implementar envío asíncrono best effort y manejo de errores para no bloquear fetch, login, UI ni navegación.
- [x] Tarea 3.4: Documentar límites de captura: edge sin respuesta JavaScript y casos sin conectividad quedan fuera hasta recuperación; IDs edge ajenos a UUID se omiten.

## Fase 4: Pruebas y validación
- [ ] Tarea 4.1: Pruebas de 429 en login sin sesión, con request_id y Retry-After.
- [ ] Tarea 4.2: Pruebas de 500, 401/403 esperados y criterio de cuáles generan evento.
- [ ] Tarea 4.3: Pruebas de network error/timeout sin status.
- [x] Tarea 4.4: Pruebas unitarias de la lógica de cola: reintento, Retry-After/backoff, dedupe, ACK, expiración y cupo; IndexedDB nativo aún requiere prueba en navegador.
- [x] Tarea 4.5: Pruebas de redacción de query, segmentos dinámicos, code/request_id libres y propiedades ajenas (body/headers/stack).
- [x] Tarea 4.6: Ejecutar `pnpm exec playwright test --config=playwright.unit.config.ts` (9/9 pasaron); prueba sin servidor ni reset e2e.
