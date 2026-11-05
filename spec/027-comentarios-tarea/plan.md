# Plan: Comentarios por tarea — Frontend

> Feature `027-comentarios-tarea` · React 19 + TanStack Start.
> Contrato: `backend_sasha/spec/019-comentarios-tarea/plan.md`.
> Móvil Flutter: **solo documentación** en esta entrega.

## Lo que verá cada rol

### Alumno y responsable
- En el detalle de cada tarea, botón **Comentarios**.
- Abre un modal tipo chat con todo el hilo.
- Pueden escribir; cada mensaje muestra nombre y rol (Alumno / Responsable / Maestro).
- El mensaje del maestro usa un color distinto.

### Maestro
- Entrada **Chats de tareas** en el menú, con badge de no leídos.
- Página con todos sus chats: tarea, clase, último mensaje y burbuja de no leídos.
- Al abrir uno, modal de chat para responder.
- Puede borrar cualquier mensaje.
- También puede abrir el chat desde el detalle de la tarea.

### Admin / admin temporal
- La misma página **Chats de tareas**, pero con todas las tareas.
- Puede escribir en cualquier chat, borrar mensajes y **silenciar/activar** el chat.
- Si está silenciado, los demás ven el chat en solo lectura.

## Diseño
- Modal de chat cómodo en PC y celular: cabecera fija, lista con scroll y caja de escritura fija abajo.
- Burbujas: propias a la derecha, demás a la izquierda; maestro con color de acento y etiqueta.
- Fechas con hora, separadores por día.
- Estado silenciado visible.
- Sin adjuntos.

## Tiempo real
- SSE reutilizando `/notificaciones/stream`: al recibir la señal se invalida el hilo y la lista.
- Polling de respaldo cada 10 s mientras el chat está abierto.
- Al abrir el chat y al recibir mensajes se marca como leído.

## Archivos

- `src/services/comentarios-tarea.ts`.
- `src/hooks/use-sse-signal.ts`.
- `src/components/comentarios/TareaChatModal.tsx`.
- `src/components/comentarios/ChatsTareasLista.tsx`.
- `src/routes/_app/chats-tareas.tsx`.
- Botones en `TareaPortalVerModal` y en los modales del maestro.
- `nav.ts`, `permissions.ts`, `command-palette.ts` y estilos.
- E2E `src/tests/e2e/comentarios-tarea.spec.ts`.

## Pruebas
- E2E: alumno/padre escribe, maestro responde y borra, admin silencia.
- `tsc`, `eslint` y `pnpm build`.

## Móvil (documentar, no implementar)
- `sasha_movil` necesitará cliente SSE o polling, quitar `receiveTimeout` para el stream y reutilizar `GET/POST /comentarios/tarea/{id}`.
