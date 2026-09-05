# Sasha Frontend PRD

Responsable: Oscar Jossué Hernández Rodríguez

Última actualización: 04/09/2026

| Campo | Valor |
| ------------------- | ------------ |
| Estado del proyecto | En desarrollo |
| Fecha de entrega | 15/10/2026 |

## Índice

1. [Descripción general](#1-descripción-general)
2. [Objetivos](#2-objetivos)
3. [Contexto](#3-contexto)
4. [Problema](#4-problema)
5. [Roles](#5-roles)
5.1. [Glosario de nombres canónicos](#51-glosario-de-nombres-canónicos)
5.2. [Exportación SACE (gobierno)](#52-exportación-sace-gobierno)
6. [Requisitos del producto](#6-requisitos-del-producto)
7. [Restricciones técnicas](#7-restricciones-técnicas)
8. [Fuera del alcance](#8-fuera-del-alcance)
9. [Tecnologías mínimas tentativas](#9-tecnologías-mínimas-tentativas)
10. [Arquitectura](#10-arquitectura)

## 1. Descripción general

1. **Por qué:** las instituciones escolares de una sola sede operan con Excel, papel e impresiones; eso hace lenta la matrícula, los horarios, el plan de estudios, la asistencia, las tareas, los pagos y el reporte al gobierno (SACE).
2. **Encaje:** Sasha Frontend es la aplicación web que consume el API del backend Sasha y centraliza en pantalla esos procesos para **una institución por despliegue**. El backend (Go, PostgreSQL, Docker y bóveda de archivos) vive en otro repositorio; este PRD define la experiencia y la capa de presentación.
3. **Problema:** datos fragmentados, retrabajo (3 formatos para lo mismo), horarios difíciles de armar, reingresos lentos y carga manual a plataformas gubernamentales.
4. **Público:** administración (admin, secretaria, director, consejería, contabilidad), maestros, responsables y alumnos; developer para auditoría.

## 2. Objetivos

1. Facilitarles el trabajo de organización a los maestros.
2. Facilitarles la organización a los alumnos.
3. Permitir a los responsables estar pendientes de sus hijos.
4. Permitir a la administración llevar control de las labores de los maestros y alumnos.
5. Permitir a contabilidad realizar el cobro y llevar el control del mismo.
6. Permitir exportar calificaciones/asistencia en el formato que pide el gobierno (SACE) sin rearmar Excel a mano.

## 3. Contexto

1. Se reúne la administración con los maestros y se les consulta si tienen algún inconveniente en algún horario o si necesitan dar clase en un horario específico; si no es el caso, se colocarán al azar.
2. Se hace una reunión administrativa donde, en un pizarrón, se empieza a acomodar los horarios de los maestros: se dejan fijos a los que no pueden ser colocados al azar y el resto se coloca al azar de tal manera que cumplan las horas mínimas por semana de cada clase. Ejemplo: la clase de español de 7.º grado tiene que ser mínimo 5 horas a la semana; entonces al maestro de español de 7.º se le acomoda el horario en lunes, martes, miércoles, jueves y viernes una hora; pero si, por ejemplo, el miércoles ya no tiene más espacio porque tiene que dar otra clase, se puede acomodar lunes 1 hora, martes 1 hora, miércoles nada porque no tiene tiempo disponible, luego el jueves 2 horas y el viernes 1 hora. Esto no requiere un orden específico: solo necesita tener las horas lo mejor repartidas, o sea, que tiene que ser una hora por día como primera instancia y solo se acumulará una hora si un día no está disponible. Este proceso se hace siempre a principio del año o principio del periodo y, si el maestro cambia, no se modifica el horario: lo que se hace es simplemente asignarle al nuevo maestro el horario de la clase del maestro que está reemplazando.
3. Se hace otra reunión y se les entregan los horarios a los maestros.
4. Los responsables de un joven llegan a matricularlo.
5. La secretaria saca papeles en físico y los llena con bolígrafo con los datos del alumno y pide ciertos documentos como fotografías, identidad, identidad de los responsables, tarjeta de salud, etc. Esos datos se registran en un papel y posiblemente en una hoja de cálculo de Excel.
6. Dependiendo de las necesidades del alumno y el grado al que vaya, será asignado a una modalidad (ejemplo: 9.º grado por la mañana de lunes a viernes, etc.). Si el responsable no tiene ningún requisito especial, esa asignación se hará prácticamente de manera aleatoria o en orden: o sea, se llenará primero 9 A, luego 9 B, luego 9 C, etc.; pero si el responsable necesita que el alumno estudie por la tarde, se le dará esa posibilidad de acomodarlo como mejor le conviene. Todo esto se pasará a un Excel.
7. Como los alumnos, los grados, las modalidades y las secciones ya están definidos para este punto, se les entrega a los responsables de manera impresa los horarios y días de clase.
8. Antes de iniciar las clases, los maestros tienen que presentar un plan de estudio donde definirían, en cada una de sus clases, en cada uno de los periodos y parciales, cómo planean evaluar a los alumnos de cada una de sus clases. Normalmente esto se hace en un archivo de Word y ese mismo plan suele ser modificado cada año, pero suele mantenerse bastante similar. En él define qué se trabajará en la clase, qué se dejará de tarea para la casa, qué será prueba, cuáles serán trabajos prácticos, cuáles de investigación, cuáles exámenes; también los puntos por asistencia y puntos extras por participación, buen comportamiento y disciplina.
9. Antes de que llegue el día de clases, la administración, al ya tener la matrícula casi terminada, imprime los listados de asistencia de cada clase y se los entrega a los maestros con espacios para agregar más filas por si entra algún alumno nuevo después. En dicho documento, en cada hoja aparece el nombre del alumno y cada día de la semana, y se le marca como que asistió o no. También es posible que algún maestro lleve esto en Excel.
10. Cada maestro lleva en papel o en Excel, con base en su plan, las tareas que va dejando y cuántos puntos le dio a cada alumno por cada curso y cada tarea.
11. El maestro evalúa en clase ciertos temas y deja tareas para la casa.
12. El alumno apunta esas tareas para la casa y se retira.
13. El alumno puede o no hacer esa tarea en la casa.
14. Al día siguiente el ciclo se repite: el maestro pasa lista, revisa tareas, enseña nuevo tema, evalúa algo en clase y deja tarea para la casa.
15. Algunos responsables preguntan a sus hijos si tienen tareas; algunos confirman y otros mienten.
16. Al finalizar cada mes, los responsables tienen que pagar una mensualidad, lo cual puede que lo hagan o no por razones personales.
17. Los alumnos cuyos responsables no han pagado aún pueden seguir estudiando, pero no pueden hacer examen; y cuando llegue la fecha de entregar calificaciones, a ellos no se les entrega hasta que paguen.
18. Los alumnos cuyos responsables sí pagaron sí hacen examen y sí reciben sus notas.
19. Los responsables que están morosos pagan después y hacen examen después si ya han pasado los exámenes; si aún no había llegado la fecha de examen, entonces lo hacen con normalidad. Muy probablemente se les cobre recargo por no haber pagado en la fecha correcta.
20. Después de finalizar un parcial o periodo, se deben subir las notas de los alumnos a una plataforma del gobierno (**SACE**) que tiene un formato JSON específico: o sea, si los maestros tenían organizado todo de una manera, ese día tienen que volver a organizar todo en un Excel y, después, ya teniendo todo listo, abrir la plataforma y subir todo en el mismo orden en que la plataforma lo pide. O sea, necesitan 3 formatos para llevar controles: 1) el del plan, 2) el del día a día, 3) el de la plataforma de gobierno (SACE). Son las mismas tareas/notas, pero agrupadas o nombradas según el formato que pide.
21. Si hubiera que hacer recuperación, se hace y se sube al sistema. Hay fechas fijas dadas por el gobierno para eso.
22. Cada tanto llega, de parte del gobierno del estado, supervisiones a ver qué plan de estudio tienen definido los maestros y cómo va el avance del mismo; entonces ahí presentan el plan que tienen definido desde principio del año.
23. Cada tanto llega un responsable reclamando a la administración o a un maestro por las calificaciones de un niño, así que necesita tener respaldo que confirme que entregó o no alguna tarea.
24. Al final del año, con base en las calificaciones mínimas definidas por el estado, un alumno queda o no aprobado para pasar al siguiente año: o sea, si estaba en 8.º, ya puede ir a 9.º grado.
25. El siguiente año todo el proceso se repite.
26. Durante todo el año, la dirección, consejería o algún puesto similar está verificando que los maestros estén dando cumplimiento a su plan de estudios.

## 4. Problema

1. Como el proceso se hace en archivos de Excel y documentos impresos, para transmitir un dato se requiere hacer múltiples impresiones e ir a mano a entregarlo a cada maestro, administración, responsables y alumnos. Y si ocurre un error o llega nueva información, hay que volver a imprimir.
2. La comparativa y el análisis de los datos es complicado porque, al ser papeles impresos y hojas de Excel individuales de diferentes áreas y diferentes maestros, no permite condensar los datos y hacer un análisis global e individual.
3. Para verificar el cumplimiento del plan es necesario ir de manera presencial ante cada maestro, pedirlo y luego revisar a ojo cada ítem y si ya se le dio cumplimiento; pero después de terminar de hacer eso, no tenemos manera de saber si al día siguiente dio cumplimiento a lo que correspondía al día siguiente, a menos que regresemos otra vez donde cada maestro, y eso es ineficiente porque hay más labores que hacer.
4. Si un alumno está faltando o no está entregando tareas con varios maestros o con uno específico, tendremos que esperar hasta el final del periodo, al hacer una revisión, para notarlo. Aparte, con tantos alumnos, tantos maestros y tantas clases, es difícil identificar si algo está siendo un caso aislado o si es un patrón con un curso, un maestro, un alumno o un responsable (ya que todos sus hijos están haciendo eso).
5. Cuando llegan las supervisiones, si el maestro no anda con su computadora o el documento impreso del plan de estudios, eso podría causar dificultad para revisar si está o no dando cumplimiento al mismo; y aunque se deje una copia con la administración, esa copia nunca estará actualizada porque sería poco eficiente estar llenando dos hojas a la vez, y esto con todos los cursos, todos los grados y todos los maestros.
6. Los responsables desconocen si sus hijos realmente tienen o no tareas: dependen de que el hijo se los haga saber o tener que estar llamando al maestro, lo cual puede ser un problema si una gran cantidad de responsables están llamando a los maestros todos los días.
7. Los alumnos son olvidadizos: si apuntan en el cuaderno que tienen tarea, probablemente lo olviden.
8. Los responsables son olvidadizos y puede que olviden la fecha de pago y por ello tengan recargos.
9. El proceso de reingreso es igual de tardado que el de una matrícula de alguien nuevo: aunque ya se tengan los datos de un alumno, cada año hay que volver a llenarlos.
10. El tener 3 formatos distintos para guardar los mismos datos es un problema, porque al tener que guardar los planes de estudios y calificaciones de 3 maneras distintas genera trabajo repetitivo (incluido el armado manual del JSON/Excel para SACE).
11. Los maestros suelen tener planes de estudios distintos: cada quien los crea a su parecer. Entonces, si un maestro nuevo llega, probablemente, si no le dejaron el plan de estudio del maestro anterior, a él le toque crear otro y, para colmo, por accidente verán temas que ya vieron con los alumnos; y aun si se lo dejaron o la administración tuviera una copia, no necesariamente podría interpretarlo.
12. Es difícil saber si estamos teniendo éxito o si hay que replantearnos el plan que tenemos.
13. El armar los horarios es tan complicado que puede tomar días o semanas el dar con un plan eficiente que cumpla con las horas mínimas por cada curso a la semana.

## 5. Roles

Roles canónicos (nombres en DB/seed del backend; el frontend debe usarlos tal cual):

| Rol (seed name) | Descripción |
| --------------- | ----------- |
| admin | Gestión general; puede gestionar cualquier usuario incluyendo passwords |
| admin_temporal | Igual que admin EXCEPTO crear/editar/borrar/cambiar password/roles de usuarios que tengan rol admin. Sí puede gestionar otros admin_temporal |
| secretaria | Operación administrativa; puede crear solo: maestro, responsable, alumno, consejeria |
| director | Dirección de la institución |
| consejeria | Seguimiento del plan de estudios |
| contabilidad | Cobros y pagos |
| maestro | Clases, asistencia, tareas, plan, calificaciones |
| responsable | Tutor del alumno |
| alumno | Estudiante matriculado |
| developer | Acceso a auditorías |

Multi-rol: un usuario puede tener varios roles vía tabla `user_role`. Cada app cliente envía el header `X-Active-Role`; los permisos de la request son **solo** los del rol activo. El frontend debe permitir elegir el rol activo y mostrar u ocultar paneles según ese rol.

Matriz de altas de usuarios:

- `admin`: todos
- `admin_temporal`: todos excepto tocar usuarios con rol `admin`
- `secretaria`: solo `maestro`, `responsable`, `alumno`, `consejeria`
- Resto: no crean usuarios
- Nadie puede auto-registrarse (sin signup público)

Password:

- Todos cambian la propia
- `admin` y `admin_temporal` pueden cambiar la de otros (con la restricción de `admin_temporal` sobre `admin`)
- Al **crear** un usuario, el backend genera un password temporal al azar y responde **un PDF de una sola vez** con todos los datos de acceso (code, username, password temporal, roles y datos de perfil). El frontend debe ofrecer descargar/imprimir ese PDF para que quien creó la cuenta se lo entregue a la persona. El password en claro **no se vuelve a exponer** después; el usuario entra con code + password y puede cambiarla.

## 5.1 Glosario de nombres canónicos

Estos nombres son obligatorios en PRD, API, base de datos y código (frontend e interfaces incluidas):

| Nombre canónico | Significado | No usar |
| --------------- | ----------- | ------- |
| modalidad | Turno (mañana/tarde, horarios del día) | jornada (como nombre de entidad Sasha) |
| seccion | A, B, C dentro de un grado | grupo |
| curso | Asignatura (Español, Matemáticas, etc.) | materia |
| matricula | Registro del alumno en un periodo + sección | inscripcion |
| grado | Nivel académico (7.º, 8.º, 9.º, etc.) | — |

Identidad de usuario:

- PK/key = solo `id` (UUID)
- `code` = UNIQUE (login y referencias de negocio); no es la PK
- `username` = `primer_nombre` + `primer_apellido`; **NO** es UNIQUE (puede repetirse)

Códigos de catálogo (auto, no los define el admin): prefijos `g`/`s`/`m`/`c` + secuencia (`g01`, `s01`, `m01`, `c01`). Compuesto legible `g01-s01-m01`. Distintos del `code` de usuario.

Matrícula: se almacena `seccion_id`; grado y modalidad se **derivan** de la sección (sin columnas redundantes). En UI, grado y modalidad se muestran derivados, no como campos editables independientes de la sección.

## 5.2 Exportación SACE (gobierno)

La plataforma gubernamental **SACE** espera un JSON con forma de referencia en `documentos_referencia/sace.json` (en el repositorio del backend).

**Importante — mapeo de nombres (no confundir con el glosario Sasha):**

| Campo en JSON SACE | Significado en SACE | Origen en Sasha |
| ------------------ | ------------------- | --------------- |
| `modalidad` | Programa académico (ej. Bachillerato Técnico en Informática) | `configuracion_institucion.modalidad_sace` |
| `jornada` | Turno / horario del día | Nombre de nuestra entidad `modalidad` (turno) |
| `codigo_sace` | Código institución | `configuracion_institucion.codigo_sace` |
| `grado` / `seccion` / `asignatura` | Etiquetas SACE | Preferir `codigo_sace` de grado/sección/curso; si no hay, el nombre |
| `tipo_documento_identidad` / `identidad` | Doc. del alumno | `perfil.tipo_documento_identidad` + `perfil.numero_identidad` |
| `evaluaciones.parcial_N` | Inasistencias + nota | `asistencia_alumno` + `calificacion_curso_parcial` |
| `recuperacion` | Recuperación | `null` si no hay dato |

Reglas de producto (frontend):

1. **No** hay pantalla de archivo SACE histórico: el frontend solicita la exportación al API (`GET /sace/export`) y descarga/muestra el JSON generado al vuelo.
2. Campos auxiliares viven en el backend: `codigo_sace` / `modalidad_sace` en configuración; `codigo_sace` en grado, sección y curso; `tipo_documento_identidad` en perfil. El frontend solo los captura/edita donde corresponda.
3. Quién exporta (permiso `sace:get`): admin, admin_temporal, director, secretaria, consejería. La UI solo muestra la acción a esos roles.
4. Filtros típicos de export en UI: periodo académico, sección, curso (y parciales opcionales).

## 6. Requisitos del producto

En prioridad estas son las opciones: Obligatorio, Importante, Deseable.

Todos los requisitos de esta sección son **obligatorios**. El frontend implementa las pantallas, flujos y estados; la persistencia y reglas de negocio las provee el API del backend.

| # | Título | Historia de usuario | Criterios de aceptación (cómo cumplimos) | Prioridad | Notas |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ----- |
| 1 | Horarios de clases | En una institución siempre se necesita tener grados, secciones y modalidades definidas (ejemplo: 9.º grado, seccion B, modalidad por la tarde de 12 a 05). Pues para hacer una distribución que permita cumplir con el mínimo de horas por clase se hace un plan y se distribuyen; sin embargo, como eso es un tanto al azar, pueden tomar días o semanas hasta que, de tirar combinaciones al azar, demos con la correcta. El cliente puede fijar a mano bloques (ej. Español lun/mar/mié 07:00 en 7.º A) y pedir que el sistema rellene el resto. | El usuario arma y reacomoda el horario las veces que quiera (**preview en memoria vía API**, semilla tipo ver-01 / ver-02). Puede enviar **bloques fijos** ya acomodados y pedir **relleno de huecos** (asignaciones/cursos/maestros que falten hasta horas mínimas). **Solo se persiste** cuando el usuario confirma/guarda. Preferir repartir 1 hora por día y acumular solo si no hay espacio. Avisar si queda subcapacidad (horas libres) o sobrecapacidad (horas extra fuera de franja normal). Poder listar versiones y reaplicar una semilla/versión. | obligatorio | Preview ≠ guardar. Confirm = persistir. |
| 2 | Matrícula de los alumnos | Al matricularse, el proceso suele dejar varios documentos sueltos que después hay que repartir como listado de alumnos, data de los alumnos, de los responsables, etc., y son datos aislados que requieren ser impresos cada vez que hay que hacerlos llegar a alguien más. Aparte, hay que llenar nuevamente todos los datos del alumno cada vez que se matricula. | Se creará un apartado que permita ingresar a los alumnos de primer ingreso sin importar el año al que entren, y estos datos serán visibles a maestros (listados), responsables (cursos, plan y horarios de sus hijos) y alumnos. La administración o secretaria podrá tener estos datos disponibles en todo momento. Cuando sea reingreso, solo se debe buscar el **código** actual del alumno y llenar los datos que falten (si es que faltara alguno) y, si no, simplemente definirlo como matriculado en el grado que el sistema indique que va: o sea, si ya finalizó 8.º, el sistema deberá devolver que va a 9.º y el responsable de la matrícula solo presionar un botón que lo matricule y listo. Y si estaba en 8.º pero reprobó y va de nuevo a 8.º, entonces debe decirle que va a 8.º de nuevo. Documentos de matrícula se suben a la bóveda vía API (solo key en DB). | obligatorio | |
| 3 | Plan de estudio | Los maestros necesitan crear un plan de estudio, un documento para control diario y un documento para subir los datos después a la plataforma del gobierno. | Crear un apartado donde se cree el plan; en otra vista ver eso mismo con el formato para el control diario; y en otro lugar para el plan de gobierno. Poder tener un calendario que me indique qué debería estar haciendo en qué fecha. | obligatorio | |
| 4 | Asistencia de alumno | El maestro debe pasar asistencia a los alumnos. | Con base en cada grado, cada seccion y cada curso, el maestro responsable podrá pasar asistencia definiendo si asistió, si no asistió de manera injustificada, o si no asistió pero sí tenía justificación. | obligatorio | |
| 5 | Tareas | El maestro debe asignar tareas y calificarlas conforme a varios criterios, con un “no cumple”, “poco eficiente”, “medio cumple”, “excelente” (por dar un ejemplo). | Tendremos un apartado para que, con base en su plan, el maestro en su día a día pueda asignar tareas y que tenga varios criterios de evaluación, y que uno de ellos sea libre: o sea, aparte de los que ya definen los puntos, tendremos otro que permite colocar cualquier cantidad. Los responsables podrán ver las tareas que tiene su hijo asignadas y si las entregó o no, y los alumnos también; sin embargo, no podrán ver los puntos de las mismas porque ese dato se les liberará cuando la administración lo defina. | obligatorio | |
| 6 | Supervisión del plan de estudio | El gobierno o la administración necesita ver cómo está el cumplimiento de los planes de estudio. | Si el gobierno llegara a visitar, cada maestro podría mostrar el plan de estudio y su cumplimiento: o sea, si el maestro ha estado asignando y calificando cursos, cada apartado del plan que corresponda a eso se marcará como pendiente, en ejecución o ejecutado; y en cada parcial cuánto lleva. Ejemplo: son cuatro parciales y son 10 cosas por cada parcial, y estamos en el primero y vamos por la cosa número 8, que indique que el plan está en ese parcial en un 80% ejecutado. Por cierto, hay cosas que no son tareas ni exámenes, sino simplemente temas que el maestro debe dar en la clase; entonces, si fuera el caso y eso está definido así en el plan, el maestro debe marcar de manera manual que ejecutó eso ya. Y cada apartado del plan no tendrá un día específico donde hará algo, sino un margen de fechas; ejemplo: del 5 al 8 de septiembre haré tal cosa. Entonces el maestro tendrá también un panel donde mostrará qué debería estar haciendo justo en esos días y que, si le indica “esta semana tiene que hacer esto y esto y esto”, él pueda darle a ver y le abra otro panel con los detalles para esa semana de trabajo. | obligatorio | |
| 7 | Pago de mensualidades, matrículas y otros términos | Los responsables necesitan poder pagar a tiempo cada uno de los gastos que corresponden. | El departamento de contabilidad podrá hacer el cobro a los responsables o alumnos donde solo agregarán el código del alumno, el tipo de pago, la fecha y observaciones. En caso de que el responsable lo hiciera por otro medio, debe tener un apartado para subir el recibo y esperar a que el departamento de contabilidad lo verifique y confirme como pagado. Los pagos que son periódicos, como las mensualidades, deben aparecer ya desde el momento de la matrícula a cada responsable para que sepa cuánto tiene que pagar cada mes y cuál es su fecha, y que tenga banderas de pendiente, pagado o en mora (o algo que suene similar). En cuanto cancele un mes, entonces el estado cambiará y le debe caer una notificación de pago realizado exitosamente. Los recibos se suben a la bóveda (MinIO) vía API; la DB solo guarda el link/key del archivo, no el binario. | obligatorio | Recibos → bóveda; DB guarda link/key. |
| 8 | Calificaciones de los alumnos | Los responsables necesitan ver las calificaciones de los hijos. | Cada responsable podrá o no ver las calificaciones de cada hijo que tenga matriculado en un apartado nuevo que dirá “calificaciones”. Ahí verá la calificación de cada curso y el promedio del periodo, un indicador si bajo, estándar, medio o alto. Pero esto se liberará en favor de que lo indique la administración, el director o el admin. Pueden liberar por grado, por seccion, por modalidad, por periodo o incluso todo de una. Pero siempre con base en la regla de que tiene que tener pagado el mes que corresponde: o sea, que si le doy liberar a todo y alguien no ha pagado, en el apartado de notas solo le dirá que las calificaciones ya fueron liberadas, pero que por la falta del pago de X meses aún no podrá verlas hasta que cancele. | obligatorio | |
| 9 | Notificaciones | Los miembros de la institución (responsables, maestros, administración y alumnos) necesitan estar informados. | El admin, secretaria o dirección pueden definir, según su nivel de permiso, notificaciones de diferentes tipos. Notificación única activa por un periodo de tiempo: o sea, aparecerá y existirá solo por el tiempo definido (1 día, 1 semana, 1 mes) y luego desaparecerá. Notificación de banner: todas las apps tendrán un banner de bienvenida normal, pero que ahí también les aparecerá una notificación que permanecerá fija ahí hasta que la quiten; esto para cosas como “el 05 de julio es la fecha de pago”, y cualquiera que entre verá eso en grande. Notificaciones periódicas, que son las que darán un mensaje cada cierto tiempo (ejemplo: una vez a la semana, una vez al mes). Ahí colocaremos cosas como “recuerda que los exámenes son la segunda semana de este mes”. Ese mensaje también durará un periodo de tiempo definido. Y en todos los casos también definiremos si el mensaje es a nivel interno (o sea, administración y maestros), si es solo para responsables y alumnos, si es para todos, o si es solo para un grupo de personas (ejemplo: responsables que no han pagado, responsables cuyos alumnos han faltado más de X periodo de tiempo, responsables cuyos alumnos reprobaron, responsables cuyos alumnos van a salir en excelencia académica, etc.). Esto para poder notificar cosas como “felicidades, su hijo José es de los mejores 10 de la institución”, etc. También se puede notificar a toda la institución: inicio de vacaciones fecha tal, o alerta por instrucciones de seguridad de los alumnos y las fuertes tormentas: las clases del día X quedan canceladas. | obligatorio | |
| 10 | Configuración | Cada institución define sus parámetros de configuración. | El admin será quien defina cuál es la calificación mínima para pasar, cuál es de honor al mérito, cuál es excelencia, cuál es de un rango demasiado bajo. También definirá el nombre de la institución, porque la app se llama Sasha pero la institución tendrá su propio nombre, y cualquier otro parámetro como que los planes deben tener estos tipos de cumplimiento: no cumple, eficiente, normal, excelente (por dar un ejemplo); cuánto dura una hora clase, ya que pueden ser 40 minutos o 50, etc.; cuánto dura un periodo (puede ser 1 año o 6 meses, etc.); cuánto dura el recreo en cada modalidad y cuántos recreos tienen. Estos datos serán útiles para el apartado que monta los horarios. También cuánto dura cada parcial y cuántos parciales tiene cada periodo. Incluye datos SACE de institución (`codigo_sace`, `modalidad_sace` = programa académico). | obligatorio | |
| 11 | Modalidades, secciones, grados | Entre instituciones pueden haber más o menos secciones, grados, cursos, etc. | El admin o quien corresponda debe ser capaz de crear cursos, secciones, modalidades: o sea, estos no son datos dados, sino que cada institución debe poder agregar esos datos ellos mismos y eliminarlos. Pueden llevar `codigo_sace` opcional para export. | obligatorio | |
| 12 | Roles | Cada usuario puede tener uno o varios roles (multi-rol vía `user_role`). | El admin (y `admin_temporal` según matriz) deberá ser capaz de asignar y quitar roles a cada usuario — no un solo rol fijo — para que sus permisos se adapten. En cada request el cliente indica `X-Active-Role` y solo aplican los permisos de ese rol activo. La UI refleja menús y acciones según el rol activo. | obligatorio | |
| 13 | Permisos | Permisos para los usuarios. | El admin debe ser capaz de bloquear o dar acceso a los usuarios con base en su rol, o incluso hacerlo de manera individual (`permiso_usuario`). | obligatorio | |
| 14 | Código, username, password y rol | Cada usuario tendrá estos campos mínimos. Sin auto-registro: las altas solo las hacen roles autorizados. | Alta sin signup: `code`/`username`/password/roles automáticos. PK=`id`; `code` UNIQUE. Password temporal al azar. **Respuesta del alta = PDF de una sola vez** (code, username, password en claro, roles, nombres) para que el frontend permita imprimir y entregar al titular; el password en claro no se reexpone. Username = primer nombre + primer apellido, no UNIQUE. Login code+password; cambio propio; admin/admin_temporal pueden resetear (con restricción sobre admin). | obligatorio | |
| 15 | Análisis y estadísticas | El admin y el director necesitan saber estadísticas. | Tendremos varios paneles para ver estadísticas por curso y grado; por grado y seccion; por grado en general; por modalidad y grado; ver quiénes van más bajos, quiénes van normales, quiénes van con honor al mérito / excelencia académica. También para ver la asistencia: cómo va cada alumno en otro panel; y otro panel de los maestros en cada curso que dan, cómo van con el índice académico en general; en otro panel qué tanto fallan tareas los alumnos según grados, secciones, etc.; e igual otro panel de qué tanto le fallan las tareas los alumnos a un maestro en cada uno de los cursos que él da. También otros temas a analizar, como el pago: cuánto ingresó en cada mes; otro para saber qué responsables están morosos; otro para ver qué responsables suelen tardar más; también qué porcentaje de los responsables logra pagar a tiempo (ejemplo: un 75% paga puntual); también otro panel de cuántos reprobados por parcial hay y por curso cada periodo. | obligatorio | |
| 16 | Auditoría | El developer necesita ver la tabla de auditorías. | Existirá un rol developer con acceso a la vista de auditorías del sistema (datos del API). | obligatorio | |
| 17 | Exportación SACE | Al cerrar parciales/periodo, administración debe subir notas e inasistencias a la plataforma del gobierno sin rearmar Excel a mano. | El frontend consume la exportación JSON del backend alineada a `documentos_referencia/sace.json` (`GET /sace/export` con periodo, sección, curso). Traduce glosario: turno Sasha → `jornada`; programa institucional → `modalidad`. Incluye metadatos (código SACE, grado, sección, asignatura) y estudiantes (documento, identidad, nombre, evaluaciones por parcial, recuperación si aplica). No inventar pantalla de archivo SACE; export bajo demanda. Campos de apoyo en configuración, catálogos y perfil. | obligatorio | Ver §5.2 |

## 7. Restricciones técnicas

1. La aplicación opera para una única institución a la vez.
2. Este repositorio es el **cliente web**. Consume el mismo API que usará un cliente móvil futuro; el móvil no forma parte del alcance de implementación de este frontend por ahora.
3. **Bóveda de documentos (MinIO, en backend):** el frontend sube/descarga vía API; se guardan keys/URLs en DB. Tipos: foto de perfil, recibos de pago, logo app, logo institución, documentos de matrícula. No se almacenan archivos binarios en PostgreSQL ni en el frontend.
4. **Horarios:** generación/preview en backend en memoria con semilla; el cliente puede enviar bloques fijos y pedir relleno; **solo se persiste tras confirmación**. Rearmar N veces no guarda hasta `confirm`.
5. **SACE:** exportación JSON bajo demanda desde UI; no es un almacén de documentos SACE en DB.
6. Login solo con **código + password**; cookie de sesión + header `X-Active-Role`.
7. El frontend se integra contra la API documentada para clientes en el backend: [`documentacion/API_CLIENTES.md`](documentacion/API_CLIENTES.md).
8. Stack de referencia del backend (otro repo): **Go**, **PostgreSQL**, **Docker** (y MinIO para bóveda). Este frontend no implementa esa capa.

## 8. Fuera del alcance

1. No se usará ni correo electrónico ni número de teléfono para los usuarios; sino que será con base en código con el que los identificaremos en cualquier lado, incluyendo pagos, reingreso, calificaciones, etc.
2. El login será con código + password (no con correo ni teléfono).
3. No signup público / auto-registro: nadie se registra solo; las altas las hacen roles autorizados.
4. No se hacen entregas de tareas desde la plataforma.
5. No se tiene mensajería: solo notificaciones unidireccionales.
6. No se hacen exámenes en la plataforma.
7. No multi-institución en un mismo despliegue.
8. No se implementa el portal web del gobierno SACE (solo la descarga del JSON para subir allí).
9. No se implementa en este repo el backend (Go/PostgreSQL/Docker) ni la infraestructura de la bóveda.

## 9. Tecnologías mínimas tentativas

1. TanStack Start
2. TanStack Query
3. TanStack Table
4. CSS con metodología BEM
5. shadcn/ui
6. pnpm
7. ZOD para asegurarnos de enviar y recibir los tipos de datos correctos en cualquier punto

## 10. Arquitectura

Arquitectura en capas:

1. app (pages)
2. componentes
3. services
4. helpers
5. hooks
6. tests

### 10.1 Arquitectura parte visual

1. Usaremos en el CSS metodología **BEM** y los componentes base serán de **shadcn/ui**. Tendremos modalidad claro y oscuro; por defecto será oscuro.
2. Tendremos nuestras propias paletas de colores típicas desde 50 hasta 900.
3. Tendremos ya definidos los colores para texto normal, texto poco llamativo, texto de énfasis y para títulos; también para cards, números, negativos, tablas, filas, fondos, etc.
4. Como usaremos BEM, dentro del CSS colocaremos tokens semánticos (ejemplo: `texto-primary`, `border-suave`, etc.) con el fin de poder hacer cambios de manera fácil a futuro.
5. La mayoría de los paneles tendrá el siguiente diseño:
   1. Sin navbar
   2. Con sidebar
   3. El sidebar tendrá los nombres de los diferentes lugares a los que navegar, con un icono diferente al principio (ejemplo: icono alumnos, icono maestros, etc.)
   4. El sidebar se podrá hacer más pequeño permitiendo solo ver los iconos
   5. Dentro de cada nueva página tendremos el título de dónde estamos de manera sutil
   6. Tendremos una tabla principal con paginación
   7. Arriba de la tabla: un buscador
   8. Arriba de la tabla: los diferentes filtros posibles
   9. Arriba de la tabla: un botón descargar Excel
   10. Arriba de la tabla: un botón que será el más llamativo, de agregar
6. La mayoría de los formularios tendrán lo siguiente:
   1. Título suave de qué es lo que haremos y dónde (ejemplo: agregar alumno)
   2. Inputs que correspondan
   3. Combobox que permita escribir y que conforme escriba aparezca lo que busca (ejemplo: escribo el código de un alumno y irán apareciendo los códigos relacionados)
   4. Al usar combobox como los de código, en algún apartado aparecerá el username del alumno, el grado y la sección, para garantizar que el dato es correcto
   5. Siempre tendremos un botón de cancelar y de guardar
   6. En ambos casos me preguntará si estoy seguro de cancelar o de guardar
   7. Todos los formularios aparecerán como modales flotando arriba del todo, centrados, que no llenan toda la pantalla; el fondo detrás del modal quedará oscuro y difuminado
   8. Cuando se guarde, si fue exitoso, en la esquina inferior derecha aparecerá el mensaje de éxito; si fue error, el mensaje de error. Si no lo tocamos, se cerrará solo en unos 5 segundos
   9. Si los formularios son demasiado grandes y se pueden dividir en secciones, lo mejor será hacer un formulario tipo Wizard donde indicaremos qué hacer y tendremos los botones de siguiente y atrás
7. En cada tabla, al dar clic derecho sobre una fila se abrirá un menú que diga ver, editar, eliminar. Con “ver” solo me abrirá un modal que me permitirá ver más a detalle toda la información y dentro un botón de descargar para descargar como PDF; el de editar nos abrirá un formulario para editarlo; y eliminar para eliminarlo, pero para asegurarnos de que estamos eliminando el dato correcto nos saldrá un diálogo de confirmación.
8. En la esquina superior derecha tendremos una campana de notificaciones con la cantidad de notificaciones que tenemos; si la presiono, se abrirá en el lado derecho un panel donde aparecerán todas las notificaciones con título, fecha y hora; al darle ver podrá ver todos los detalles de esa notificación.
9. El admin tendrá un panel que se llamará controladores donde podrá dar o quitar permisos a las personas y ahí mismo podrá agregarles o quitarles roles.
10. El admin tendrá un panel donde definirá la configuración de la institución.
11. El admin tendrá un panel donde definirá las notificaciones y tendrá tabla de las notificaciones que están como periódicas; podrá activarlas o desactivarlas de manera temporal o eliminarlas directamente.

### 10.2 Casos especiales de diseño

1. El panel para crear los horarios: al dar agregar primero nos dará un wizard para los datos (qué clase, qué sección, etc.); luego un panel tipo modal con la primera columna en franjas horarias (ejemplo: 07:00 - 07:40, luego 07:40 - 08:20, etc.) según lo seleccionado en el wizard y según la configuración ya definida (duración de cada clase, duración del recreo, cuántas horas tiene esa jornada). En las otras columnas dirá los días (ejemplo: lunes, martes, miércoles, jueves, viernes), según los días definidos. En el lado derecho habrá una tabla pequeña scrolleable, más alta que ancha, con pastillas de clases en un único texto (ejemplo: `español-septimo-seccion1`). Si esa clase pide mínimo 3 horas, aparecerá 3 veces esa misma pastilla. La idea es poder hacer drag and drop. Arriba de ese espacio habrá un buscador (si escribo “septimo” aparecen las de séptimo; si escribo “español”, las de español, etc.). También habrá un botón arriba de la tabla principal de armado de horarios que diga **generar**; al accionarlo aparecerá una confirmación preguntando si quiere vaciar todo lo que ya tiene o rellenar solo los espacios faltantes. Si selecciona el primero, se borrará lo que tenía y se rellenará según lo que defina la API; si selecciona el otro, se rellenarán huecos enviando los espacios inamovibles. En el horario también deben aparecer pastillas de recreos para arrastrar y soltar (pueden tener duración distinta, por ejemplo 20 minutos); si dice que son 5 recreos por semana, aparecerán los 5. Esas pastillas de recreo irán siempre arriba para definirlas primero. Podremos generar cuantas veces queramos; cuando estemos seguros, pulsaremos guardar para persistirlo vía API.

### 10.3 Arquitectura — reglas

1. La entrada a las diferentes vistas dependerá del rol activo en ese momento. Como cada usuario puede tener varios roles, en el sidebar le aparecerán habilitados los botones/paneles definidos según sus roles (y el rol activo enviado en `X-Active-Role`).
