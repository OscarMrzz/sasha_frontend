# Plan de Especificación: Recuperaciones por período - Frontend

Estado: pendiente de aprobación. Backend relacionado: `backend_sasha/spec/027-recuperaciones-por-periodo/plan.md`.

## 1. Visión General y Objetivos

- **Problema:** `/recuperaciones` construye sus filas a partir de notas guardadas. Un parcial sin recuperaciones no aparece y la acción Agregar exige volver a elegir una etapa. El panel depende de las materias de asistencia del período activo y no permite revisar otro período.
- **Alcance del módulo:** cambiar el panel a un listado de etapas generado por el calendario y las reglas del período, con filtro de período precargado en el activo y contexto de una clase autorizada. Mostrar claramente la nota efectiva y el historial breve de cada recuperación. Consumir la regla central de backend que toma la mayor nota final.
- **Fuera de alcance:** app móvil Flutter, esquema de base de datos, creación de recuperaciones adicionales a las configuradas, cambios de permisos, pago o liberación de notas, y convertir este panel en un listado global de todas las clases.

## 2. Historia de Usuario y Criterios de Aceptación

**Historia:** como maestro o administrador autorizado, quiero elegir un período y abrir directamente sus parciales y finales para registrar o revisar las recuperaciones de la clase.

- Al entrar, queda seleccionado el período `ACTIVE`. Si no hay uno, el filtro queda sin selección y solicita elegir un período; no se elige otro silenciosamente.
- El filtro usa `Combobox` y las etiquetas del proyecto. No hay botón Agregar.
- Se conserva la última clase elegida si pertenece al período y sigue autorizada; en caso contrario, se usa la primera clase autorizada del período, ordenada de forma estable. El nombre de la clase continúa visible.
- La tabla muestra I parcial, II parcial, etc., cuando su fecha de inicio ya llegó, incluso si no existen recuperaciones guardadas. Un parcial futuro no aparece. Las filas Final 1…N corresponden a `recuperaciones_periodo` y aparecen siempre según esa configuración, con un aviso de no disponibles antes del inicio del último parcial.
- Cada parcial aparece y se habilita al llegar su fecha de inicio; si aún no tiene notas no habrá candidatos. Final 1…N se habilitan al iniciar el último parcial configurado, cualquiera que sea su número.
- Abrir y Editar fijan la etapa de la fila. La vista móvil presenta una card por etapa y las mismas acciones en su menú.
- En recuperaciones de parcial, original 60 y recuperación 70 producen nota efectiva 70; ambas notas siguen identificadas. Una recuperación inferior no baja la nota original.
- En finales, promedio original 50, Final 1 de 60 y Final 2 de 80 producen final 80. También prevalece 85 frente a una Final 2 de 80. Se respeta el tope configurado.
- El resultado de clase y promoción usa la nota efectiva. El historial se muestra en un comentario pequeño, por ejemplo: `Original 50 · Final 1: 60 · Final 2: 80`.
- El responsable y el alumno reciben el resultado actualizado cuando los parciales sean visibles. Una deuda que bloquee notas mantiene el aviso de pago pendiente.

## 3. Arquitectura y Componentes Específicos

### Archivos a crear

- No se requiere una nueva página ni dependencia. Se pueden extraer componentes internos de etapas o historial solo si la implementación lo necesita.

### Archivos a modificar

- `src/routes/_app/recuperaciones.tsx`: cargar opciones propias de recuperaciones, seleccionar período y clase autorizada, consumir `etapas[]`, retirar estado/modal de Agregar y mantener acciones de fila.
- `src/services/recuperaciones.ts`: DTOs de opciones, período, clase y etapa; `listOpcionesRecuperaciones(periodoId?)`; período explícito en listado y candidatos; cálculo de vista previa que conserve la mejor nota entre promedio e intentos.
- `src/components/recuperaciones/RecuperacionModal.tsx`: etapa fija, disponibilidad, nota original del parcial o promedio original del período, historial compacto y nota que cuenta. Distinguir la nota del intento editado del resultado global.
- `src/components/portal/ResultadoPeriodo.tsx`: representar el historial como Original/Final N y destacar la nota final que determina aprobación.
- `src/services/portal.ts`: solo si la documentación de los campos existentes debe aclarar su significado; reutilizar `promedio`, `final`, `recuperaciones_periodo` y `recuperacion_aprobada`.
- `src/styles/style1.css`: adaptar fila, historial y modal a tokens existentes, nombres largos y pantallas estrechas.

### Tipos y contratos

- `GET /recuperaciones/opciones?periodo_academico_id=` devuelve períodos y clases autorizadas del período solicitado; sin parámetro devuelve el activo como selección inicial. El resultado vacío conserva el período seleccionado y `clases: []`.
- `GET /recuperaciones/?asignacion_docente_id=&periodo_academico_id=` devuelve el contexto de período/clase, `etapas[]` y los campos existentes. Cada etapa contiene `id`, `tipo`, `parcial_id`, `numero`, `etiqueta`, `disponible` y `mensaje?`. Los parciales incorporan `fecha_inicio` e `iniciado` calculados por backend en America/Tegucigalpa.
- `GET /recuperaciones/candidatos` incorpora período explícito y devuelve por alumno promedio/nota original, nota del intento y contexto suficiente de las demás finales para la vista previa de la nota efectiva.
- `PUT /recuperaciones/` conserva su contrato actual de notas por alumno y etapa. El backend valida propiedad, etapa y disponibilidad; nunca se confía en una nota efectiva calculada en el navegador.
- Las query keys incluyen período y clase. Al cambiar período se cierra cualquier modal para evitar escribir en la clase anterior.
- Guardar invalida listado, candidatos y las consultas de calificaciones, resumen, resultado y sugerencia de reingreso que dependan del resultado académico. Sin polling ni consultas ligadas al reloj.

### Interfaz y estilos

- Reutilizar `DataTable`, `Combobox`, `Field`, `Modal`, `ConfirmDialog`, `NumberInput`, `RowMenu` y tokens del proyecto. Tabla de registros con buscador `Buscar…`, Excel y conteo; la instrucción explícita del usuario elimina Agregar.
- El historial es texto secundario de varias líneas si hace falta; nunca fuerza desbordamiento. En móvil los botones y campos respetan los patrones actuales del proyecto.

## 4. Manejo de Errores y Casos Borde

- Sin período activo, período sin clases, clase revocada y período sin parciales tienen estados vacíos concretos; un fallo API no se presenta como lista vacía.
- Al cambiar período no reutilizar datos de otra clase ni dejar un modal anterior operativo. Invalidar selección que ya no pertenezca al período.
- Las etapas sin notas existen igual; los parciales futuros se excluyen por la fecha del servidor. Un período finalizado permite consulta y bloquea edición.
- Cero finales configuradas produce cero filas Final. N finales produce exactamente N etapas; las notas históricas fuera de la configuración se conservan en el historial según el contrato backend y no se borran.
- Borrar una nota con campo vacío recalcula desde original y los intentos restantes; no convierte cero en vacío. Validar decimales y rango 0–100.
- La vista previa de una Final 2 menor que Final 1 conserva la nota mayor. La corrección de una recuperación previa no oculta los intentos posteriores que ya tienen nota.
- No exponer resultados anuales por el portal si un parcial está bloqueado por pago o falta liberar.

## 5. Estrategia de Costo Cero / Entorno Local

- Usa React, TanStack y componentes ya instalados; API Go y PostgreSQL existentes. Sin librerías nuevas, servicios de pago ni migración.
- Antes de implementar: consultar las skills locales de TanStack según `AGENTS.md`; leer la skill visual del proyecto.
- Verificación prevista tras aprobación: revisión estática, tipos, lint, formato y build. Pruebas nuevas/ejecución solo si se autorizan según las instrucciones de la sesión; registrar cualquier límite real de infraestructura.
- MAPA frontend se actualiza al terminar únicamente con autorización. No se hace commit ni push por preparar este plan.
