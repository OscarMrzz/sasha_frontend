# Checklist de Tareas: Recuperaciones por período - Frontend

## Fase 1: Tipos, contratos y estado de página
- [x] Tarea 1.1: Añadir DTOs frontend para períodos, clases autorizadas, etapas visibles y campos de disponibilidad de parciales.
- [x] Tarea 1.2: Añadir servicios para consultar opciones del período y pedir recuperaciones con período y clase explícitos.
- [x] Tarea 1.3: Incluir periodo y asignación en las query keys para evitar mezclar resultados al cambiar selección.

## Fase 2: Filtro, clase y etapas
- [x] Tarea 2.1: Sustituir el botón Agregar por el Combobox de períodos, precargando el período activo.
- [x] Tarea 2.2: Conservar la última clase seleccionada si pertenece al período; si no, elegir de forma estable una clase autorizada de ese período y mostrar su nombre.
- [x] Tarea 2.3: Consumir `etapas[]` para mostrar parciales desde su fecha de inicio aunque no existan notas, y Final 1…N según la configuración.
- [x] Tarea 2.4: Mostrar disponibilidad y mensajes por etapa; cerrar el modal e invalidar selecciones anteriores al cambiar período o clase.
- [x] Tarea 2.5: Mantener Abrir/Editar en escritorio y el menú de acciones en cards móviles; fijar la etapa seleccionada en el modal.

## Fase 3: Captura de notas e integración de resultados
- [x] Tarea 3.1: Mostrar nota original del parcial junto con la recuperación y la nota efectiva que cuenta, respetando el tope.
- [x] Tarea 3.2: Mostrar promedio original, cada Final N y la mejor nota efectiva en la vista de recuperación final.
- [x] Tarea 3.3: Presentar historial compacto de promedio original y Final 1…N en el resultado anual por clase, con recuperación aplicada y estado aprobado/retrasado.
- [x] Tarea 3.4: Mantener los mensajes de mora y el ocultamiento de resultados cuando exista un parcial bloqueado por pago o no liberado.
- [x] Tarea 3.5: Tras guardar, refrescar lista, candidatos y consultas afectadas de calificaciones, resultado y sugerencia de reingreso, sin polling.
- [x] Tarea 3.6: Ajustar estilos con tokens existentes para notas, estados, historial y pantallas estrechas sin desbordamientos.

## Fase 4: Bordes y validación
- [ ] Tarea 4.1: Manejar sin período activo, períodos sin clases/parciales, cero finales y fallos de API como estados distintos.
- [ ] Tarea 4.2: Confirmar visualmente período cambiado, parcial vacío/iniciado, final no disponible, corrección de intento previo y móvil.
- [x] Tarea 4.3: Ejecutar lint, formato, comprobación de tipos y build; las pruebas quedan sujetas a autorización explícita.
- [ ] Tarea 4.4: Actualizar el MAPA frontend tras autorización del usuario.
