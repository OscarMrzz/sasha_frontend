# Plan de Especificación: Modo examen para personal - Frontend

- **ID:** 031-modo-examen-staff
- **Estado:** implementación verificada; MAPA pendiente de consulta al usuario (2026-11-11)
- **Contrato relacionado:** `backend_sasha/spec/024-modo-examen-staff/plan.md`
- **Base existente:** `spec/028-horario-examenes`, modo del maestro y regla de consultas de `AGENTS.md`.

## 1. Visión General y Objetivos

- **Problema:** Director, Consejería, Admin y Coordinador necesitan supervisar los exámenes del momento con el nombre del maestro encargado y sus secciones, sin entrar como maestro ni generar consultas periódicas.
- **Alcance del módulo:** añadir un modo limpio de Semana y Ahora para los cuatro roles pedidos. Director, Consejería y Admin reciben todos los exámenes publicados y activos del periodo; Coordinador recibe solo las clases de sus coordinaciones. El backend decide ese alcance.
- El encabezado de cada grupo muestra el maestro supervisor y las secciones a cargo, por ejemplo **Pedro Ramírez · Séptimo-1, Séptimo-2**, seguido de los exámenes de esas secciones. Se usa `supervisores`, no `maestro_nombre` (docente de la materia).
- La vista Ahora consulta una vez al entrar, y vuelve a consultar solo al pulsar **Ahora**. Cronómetro, aviso de cinco minutos, aviso final y sonido se calculan en el navegador con los datos recibidos.
- No requiere migración nueva ni paquetes nuevos. No cambia los permisos de escritura de asistencia o reportes.

### Decisiones aprobadas

1. El alcance son los roles `admin`, `director`, `consejeria` y `coordinador`; `admin_temporal` queda fuera.
2. El modo staff es explícitamente de solo lectura: no muestra **Pasar lista** ni **Reportar alumno**, aunque un rol tenga permisos genéricos de escritura. Los endpoints existentes requieren identidad de maestro supervisor; estas consultas no amplían esa autorización ni modifican los permisos o las validaciones de escritura del backend.
3. Un examen con varios supervisores se muestra una sola vez con todos sus responsables. La clave de agrupación es el conjunto ordenado de IDs de supervisor; cada grupo resume sus secciones sin repetirlas.
4. La semana usa el mismo componente visual del maestro con todos los exámenes que el backend permita; no ofrece un control que amplíe el alcance del coordinador.

## 2. Historia de Usuario y Criterios de Aceptación

- **Historia:** Como Director, Consejería, Admin o Coordinador, quiero abrir el modo examen y consultar qué se está aplicando y quién supervisa cada sección, para recorrer la institución con la información del bloque actual.
- **Criterios de aceptación:**
  - Dado un rol habilitado, cuando abre el modo examen, ve la semana de exámenes y el botón **Ahora**, con el diseño limpio del modo maestro.
  - Dado Director, Consejería o Admin, cuando abre Ahora, ve todos los exámenes vigentes en la fecha y hora consultadas. Dado Coordinador, ve solo exámenes de las clases que coordina.
  - Dado un maestro responsable de varias secciones con examen actual, el encabezado muestra su nombre y esas secciones, y debajo los exámenes correspondientes.
  - Dado un examen con supervisión compartida, aparece una sola tarjeta de examen con todos los responsables; el seguimiento de alertas usa una sola entrada por `examen_asignacion_id`.
  - Dado que el usuario permanece en Ahora, avanzar el reloj, cambiar el foco, recuperar la red o llegar al fin del examen no provoca solicitudes del endpoint de Ahora.
  - Dado que pulsa **Ahora**, se realiza una sola solicitud con la fecha y hora locales del momento de la pulsación; no se cambia la clave de la consulta con un intervalo de reloj.
  - Dados los datos ya recibidos, el navegador avisa al entrar en los últimos cinco minutos y al terminar; aceptar el aviso silencia la alarma y conserva el contador.
  - Dado que termina un bloque, no se carga el siguiente automáticamente; el usuario pulsa **Ahora** para obtener una nueva instantánea.
  - Dado un examen sin supervisor, se muestra bajo **Sin maestro responsable asignado**, sin confundir al docente de la materia con el supervisor.
  - Ningún rol en el modo staff ve controles de asistencia o reportes. Un rol ajeno a los habilitados no accede a las rutas aunque tenga otros permisos de exámenes.

## 3. Arquitectura y Componentes Específicos

### Archivos a crear

- `src/routes/_app/modo-examen.tsx`: ruta padre; muestra Semana en la ruta exacta y `Outlet` en Ahora.
- `src/routes/_app/modo-examen/ahora.tsx`: consulta puntual y composición de alertas/panel agrupado.
- `src/components/examenes/ExamenAhoraStaffPanel.tsx`: encabezados de responsables y tarjetas de exámenes de sus secciones, incluida la información de pagos pendientes que ya entrega Ahora.
- `src/lib/examenes-supervision.ts`: agrupación determinista de supervisores, secciones y exámenes, sin llamadas de red.

### Archivos a modificar

- `src/components/layout/AppShell.tsx`: acceso/salida del modo para roles habilitados y reconocimiento del modo limpio en las rutas nuevas.
- `src/helpers/nav.ts` y `src/helpers/command-palette.ts`: acceso **Modo examen**, con permiso y lista explícita de roles.
- `src/services/examenes.ts`: funciones de los dos endpoints de supervisión; reutilizar los DTO de Semana y Ahora.
- `src/components/examenes/ExamenSemanaPanel.tsx`: reutilizar con datos ya autorizados, sin resaltar “lo mío” ni ofrecer ampliar a “Ver todo” cuando no aplica.
- `src/components/examenes/ExamenAhoraAlertas.tsx`: reutilizar sobre la lista única completa; modificar solo si necesita un ajuste concreto para el modo compartido.
- `src/styles/style1.css`: estilos sólidos del encabezado agrupado y adaptación móvil, solo si los existentes no bastan.
- `src/routeTree.gen.ts`: regenerado mediante las herramientas del router al implementar.

### Modelos de datos y contrato

- `GET /examenes/supervision/semana?periodo_id=…` devuelve el contrato de `ExamenMiosResponse` con el conjunto permitido por el rol.
- `GET /examenes/supervision/ahora?fecha=AAAA-MM-DD&hora=HH:MM&periodo_id=…` devuelve `ExamenAhoraResponse`; el backend deriva el alcance de la sesión.
- Los encabezados usan IDs y nombres de `supervisores[]`. Las secciones se resumen a partir de los exámenes recibidos, evitando nombres de secciones fuera del alcance.
- Clave de consulta estable y separada del maestro, por ejemplo `['examenes', 'supervision', 'ahora']`; el `queryFn` calcula `localConsulta()` cuando se ejecuta. Sin `refetchInterval`, foco, reconexión ni reintentos automáticos para esta consulta; una petición al montar y una por pulsación.
- La fecha/hora de la instantánea recibida se muestra en la pantalla. Los temporizadores no invalidan ni refrescan consultas.

### Interfaz y estilos

- Reutilizar `ExamenSemanaPanel`, `ExamenAhoraAlertas`, tarjetas de alumnos y tokens actuales. Colores sólidos, sin degradados. Todo buscador conserva **Buscar…**.
- Semana conserva el filtro de grado, sección y fecha sobre el conjunto autorizado. Ahora se agrupa por responsables; secciones ordenadas de forma estable, luego exámenes por grado/sección/hora/materia.
- Acceso propuesto desde la navegación como **Modo examen**; la salida retorna al inicio normal del rol. La gestión de horarios en `/examenes` conserva su finalidad administrativa.
- Los modales de mora global no se reutilizan en Coordinador mientras su endpoint no garantice el alcance. Los pagos pendientes de los exámenes actuales sí se muestran desde la respuesta autorizada.

## 4. Manejo de Errores y Casos Borde

- Sin periodo activo, sin horarios publicados o sin exámenes vigentes: estado vacío claro y botón Ahora disponible. Puede mostrarse el siguiente examen autorizado del día si viene en el contrato, sin cargarlo automáticamente.
- Coordinador sin coordinaciones activas: conjunto vacío; nunca se interpreta como autorización global.
- Un maestro con varias secciones: una etiqueta por sección y examen, sin duplicados por el join de supervisores.
- Supervisión compartida: agrupar por conjunto de responsables y enviar al motor de alertas la lista única de exámenes, sin multiplicar sonidos por tarjeta o grupo.
- Cambio de horario después de consultar: la instantánea permanece hasta la acción manual, como pide el usuario; una nueva respuesta actualiza el seguimiento local usando el ID de examen y su nueva hora de fin.
- Fallo de red: mensaje mediante `userMessageFromError`, sin bucle de reintentos. El usuario vuelve a pulsar Ahora.
- El reloj usa fecha y hora locales según el patrón existente. No enviar una hora capturada al montar cuando se pulse el botón varios minutos después.
- No reutilizar claves de caché del maestro para la vista institucional. Revisar el reseteo de caché de sesión existente para evitar datos de un rol anterior.

## 5. Estrategia de Costo Cero / Entorno Local

- React, TanStack Query, rutas, componentes, audio y estado local existentes; sin nuevas dependencias ni servicios.
- El único trabajo periódico es local al navegador. No se añaden cron jobs, WebSockets, notificaciones push ni polling.
- Validación prevista tras aprobación: alcance por rol, agrupación, carga puntual, botón con hora actual y alertas locales; no ejecutada durante la planificación.
- Al terminar la implementación se preguntará por la actualización del MAPA correspondiente. Este plan no lo modifica.
