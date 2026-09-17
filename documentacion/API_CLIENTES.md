# Guía de API — Backend Sasha (para clientes web / móvil)

Documento para que el frontend (u otros clientes) sepan **cómo autenticarse y cómo pedir cada recurso**.

Base URL (local típica): `http://localhost:<puerto>`  
Formato: JSON (`Content-Type: application/json`), salvo donde se indique PDF o multipart.

---

## 1. Autenticación (obligatorio entender esto primero)

### Login

```http
POST /login/
Content-Type: application/json

{ "user": "1002026100", "password": "..." }
```

- `user` = **código** del usuario (no email).
- Respuesta: cookie HttpOnly **`auth_token`** (el navegador la guarda si usas `credentials: 'include'`).
- Body típico (roles reales del usuario; el cliente los usa internamente según la app):

```json
{
  "message": "sesión iniciada",
  "status": "OK",
  "code": "1002026100",
  "username": "admin",
  "roles": ["admin"]
}
```

### En cada petición protegida

1. Enviar la cookie `auth_token` (automático en browser con credentials).
2. Enviar el header:

```http
X-Active-Role: admin
```

o varios roles (esta app escolar manda **todos** los del login):

```http
X-Active-Role: maestro,responsable
```

- Cada valor debe ser un rol que el usuario tenga en el JWT.
- Los permisos se evalúan con **unión**: basta con que **uno** de los roles enviados tenga el permiso.
- Una app distinta (p. ej. portal de padres) puede mandar solo `responsable` e ignorar el resto.

### Logout

```http
POST /logout/
```

(borra la cookie; no exige `X-Active-Role`).

### Errores

Respuestas de error en JSON (`apperr`), con mensaje legible. Códigos habituales: `401` sin sesión, `403` sin permiso / rol inválido, `400` validación.

### Health (sin auth)

```http
GET /health
→ { "status": "ok" }
```

---

## 2. Flujo recomendado al arrancar

1. `POST /login/`
2. Elegir rol → guardar y mandar `X-Active-Role` en todo lo demás.
3. Cargar catálogos / configuración según pantalla.
4. Operar el dominio (matrícula, horarios, tareas, etc.).

Alta de usuario (admin/secretaria):

```http
POST /users/
X-Active-Role: admin
```

Respuesta: **PDF** de credenciales (`application/pdf`) + headers `X-User-Code` (código) y `X-User-Id` (UUID para vincular perfiles en `/personas/*`). No es JSON.

---

## 3. Horarios (cómo pedir preview / guardar)

Regla de producto:

| Acción del cliente | Endpoint | ¿Guarda en DB? |
|--------------------|----------|----------------|
| Armar / rearmar las veces que quiera | `POST /horarios/preview` o `preview-periodo` | **No** |
| Confirmar lo que ya le gustó | `POST /horarios/confirm` | **Sí** |

### Opción A — El cliente manda la grilla (fijos + qué falta rellenar)

```http
POST /horarios/preview
X-Active-Role: admin
```

```json
{
  "slot_minutes": 40,
  "modalidad_hora_inicio": "07:00",
  "modalidad_hora_fin": "12:00",
  "extra_hora_fin": "14:00",
  "dias": [1, 2, 3, 4, 5],
  "recreos": [{ "hora_inicio": "09:40", "hora_fin": "10:00" }],
  "bloques_fijos": [
    {
      "asignacion_docente_id": "<uuid>",
      "seccion_id": "<uuid>",
      "curso_id": "<uuid>",
      "maestro_id": "<uuid>",
      "dia_semana": 1,
      "hora_inicio": "07:00",
      "hora_fin": "07:40"
    }
  ],
  "asignaciones": [
    {
      "asignacion_docente_id": "<uuid>",
      "seccion_id": "<uuid>",
      "curso_id": "<uuid>",
      "maestro_id": "<uuid>",
      "horas_semana_minimas": 4,
      "grado_label": "7"
    }
  ],
  "numero_version": 1
}
```

- `bloques_fijos`: lo que el usuario **ya acomodó** (se respetan).
- `asignaciones`: horas mínimas a cumplir; el backend **rellena huecos** que falten.
- Cambiar `numero_version` (o llamar de nuevo) = **rearmar** otra propuesta; sigue sin guardar.

Respuesta (resumen):

```json
{
  "codigo_semilla": "ver-01",
  "numero_version": 1,
  "slots": [ /* ... es_fijo, es_extra, horas ... */ ],
  "avisos": [],
  "resumen_capacidad": {}
}
```

### Opción B — Cargar asignaciones del periodo desde el servidor

```http
POST /horarios/preview-periodo
```

```json
{
  "periodo_academico_id": "<uuid>",
  "modalidad_id": "<uuid>"
}
```

### Guardar de verdad

```http
POST /horarios/confirm
```

```json
{
  "periodo_academico_id": "<uuid>",
  "codigo_semilla": "ver-01",
  "numero_version": 1,
  "activar": true,
  "slots": [ /* copiar slots del último preview */ ]
}
```

Otras:

- `GET /horarios/versiones?periodo_academico_id=<uuid>`
- `POST /horarios/reaplicar` body `{ "version_id", "activar" }`

Permiso: `horarios:post` / `horarios:get`.

---

## 4. Matrícula

| Método | Ruta | Permiso | Para qué |
|--------|------|---------|----------|
| POST | `/matricula/` | `matricula:post` | Primer ingreso |
| GET | `/matricula/` | `matricula:get` | Listar |
| GET | `/matricula/{id}` | `matricula:get` | Por id o código alumno |
| GET | `/matricula/sugerencia?code=` | `matricula:get` | Grado sugerido (reingreso) |
| POST | `/matricula/reingreso` | `matricula:post` | Reingreso por `user_code` |
| POST | `/matricula/{matricula_id}/responsables` | `matricula:post` | Vincular responsable |
| POST | `/matricula/{matricula_id}/documentos` | `matricula:post` | Doc (object_key bóveda) |

Crear ejemplo:

```json
{
  "alumno_id": "<uuid>",
  "periodo_academico_id": "<uuid>",
  "seccion_id": "<uuid>",
  "generar_mensualidad": true
}
```

Asignación automática de sección (reparte entre secciones del mismo grado+modalidad, priorizando las con menos inscritos ACTIVE en el periodo; respeta `cupo_maximo`):

```json
{
  "alumno_id": "<uuid>",
  "periodo_academico_id": "<uuid>",
  "asignar_seccion_automatica": true,
  "grado_id": "<uuid>",
  "modalidad_id": "<uuid>",
  "generar_mensualidad": true
}
```

Reingreso: `{ "user_code", "periodo_academico_id", "seccion_id?" }`. Sin `seccion_id` puede devolver sugerencia de grado.

---

## 5. Catálogos y configuración

### Configuración

- `GET /configuracion/` — `configuracion:get`
- `PUT /configuracion/` — `configuracion:put` (campos parciales)

Incluye nombre de la institución, `codigo_sace` institucional y umbrales de calificación.  
Calendario (hora clase, periodo, parciales, recreos) van en cada **modalidad** (turno).  
`modalidad_sace` (programa académico SACE) va en **configuración** institucional.

### Catálogos (`catalogos:get|post|put|delete`)

| Recurso | Rutas |
|---------|--------|
| Grados | `/catalogos/grados` (+ `/{id}`) |
| Modalidades | `/catalogos/modalidades` (+ `/{id}`) — `hora_inicio`, `hora_fin`, `dias`, `duracion_hora_clase_minutos`, `duracion_periodo_meses`, `cantidad_parciales_por_periodo`, `duracion_parcial_dias`, `duracion_recreo_minutos`, `cantidad_recreos` |
| Secciones | `/catalogos/secciones` (+ `/{id}`) — `grado_id`, `modalidad_id` |
| Cursos | `/catalogos/cursos` (+ `/{id}`) — `horas_semana_minimas` |
| Periodos | `/catalogos/periodos` (+ `/{id}`) |

Códigos de catálogo (`g01`, `s01`, …) los genera el backend.

---

## 6. Personas

Permiso: `personas:get|post`.

| Método | Ruta |
|--------|------|
| POST/GET | `/personas/alumnos` |
| GET | `/personas/alumnos/{id}` |
| POST/GET | `/personas/maestros` |
| POST/GET | `/personas/responsables` |

Body create típico: `user_id`, `primer_nombre`, `primer_apellido`, opcionales identidad / `tipo_documento_identidad` (SACE), etc.  
Primero crear el **user** (`POST /users/`), luego el perfil de persona con ese `user_id`.

---

## 7. Asignación docente

- `POST /asignacion/` — `{ maestro_id, curso_id, seccion_id, periodo_academico_id }`
- `GET /asignacion/`, `GET /asignacion/{id}`

Permiso: `asignacion:get|post`.

---

## 8. Plan de estudio, asistencia, tareas, calificaciones

### Plan (`planestudio:get|post|put`)

- `GET /planestudio/` — listado (filtros: periodo, curso, maestro, modalidad, grado; maestro solo ve los suyos)
- `POST /planestudio/` — plan + items (`estado_aprobacion=pendiente`; primer plan de la asignación queda `es_activo`)
- `GET /planestudio/{id}` — detalle + items + comentarios de auditoría
- `PUT /planestudio/{id}` — editar items (maestro dueño)
- `PUT /planestudio/activar/{id}` — activar plan (desactiva hermanos de la misma asignación)
- `PUT /planestudio/aprobacion/{id}` — `aprobado` \| `denegado` \| `pendiente` (admin/director/consejería)
- `POST /planestudio/auditoria/{id}` — comentario por ítem (tarea para el maestro)
- `PUT /planestudio/auditoria/{id}/resolver` — marcar tarea resuelta (+ opcional editar ítem)
- `GET /planestudio/pdf/{id}` — PDF del plan
- `GET /planestudio/vistas/diario?plan_estudio_id=` (o `asignacion_docente_id` / `periodo_academico_id`)
- `GET /planestudio/vistas/gobierno?...`
- `PUT /planestudio/cumplimiento/{itemId}` — cumplimiento / % avance

Campos de plan: `estado_aprobacion`, `es_activo`, `estado_auditoria_maestro` (`sin_revisar` \| `en_progreso` \| `finalizado`).

### Asistencia (`asistencia:post`)

```http
POST /asistencia/
```

Un registro o `{ "items": [ { "alumno_id", "asignacion_docente_id", "fecha", "tipo_codigo": "presente|injustificada|justificada" } ] }`

### Tareas (`tareas:get|post`)

- `POST /tareas/`
- `POST /tareas/calificaciones`
- `GET /tareas/alumno/{alumnoId}` — a alumno/responsable **puede ocultar puntos** hasta liberación

### Calificaciones (`calificaciones:get|post|put`)

- `POST|PUT /calificaciones/upsert`
- `POST /calificaciones/liberacion` — liberar por alcance (periodo/grado/sección/…)
- `GET /calificaciones/notas?alumno_id=&periodo_academico_id=` — puede bloquear por mora

---

## 9. Pagos

Permiso: `pagos:get|post|put`.

| Método | Ruta | Uso |
|--------|------|-----|
| POST | `/pagos/cobro` | Cobro por `alumno_code` + tipo/monto |
| POST | `/pagos/evidencia` | Subir key de recibo ya en bóveda |
| PUT | `/pagos/{id}/verificar` | Contabilidad confirma |
| POST | `/pagos/obligaciones/generar` | Crear obligaciones (matrícula/mensualidad) |
| GET | `/pagos/mora` | Listar en mora |

---

## 10. Notificaciones

- `POST /notificaciones/` — crear (banner / periódica / etc.; `tipo_codigo`, roles, segmentos)
- `GET /notificaciones/` — listar para el usuario/rol (query opcional `grado_id`, `seccion_id`)
- `POST /notificaciones/{id}/leer` — marcar leída (permiso `notificaciones:get`)

---

## 11. Estadísticas, SACE, bóveda, auditoría, users

### Estadísticas (`estadisticas:get`)

- `GET /estadisticas/counts`
- `GET /estadisticas/paneles/curso-grado`
- `GET /estadisticas/paneles/asistencia`
- `GET /estadisticas/paneles/maestros`

### SACE (`sace:get`)

```http
GET /sace/export?periodo_academico_id=&seccion_id=&curso_id=
```

JSON listo para gobierno (`metadatos_documento` + `estudiantes`).  
Nota: en el JSON SACE, `modalidad` = programa académico y `jornada` = turno interno.

### Bóveda (MinIO; si está configurado)

- `POST /boveda/upload` — multipart: `file` + `tipo` (`perfil_foto`, `recibo_pago`, `logo_app`, `logo_institucion`, `documento_matricula`)
- `GET /boveda/object?key=` — descarga o `redirect=1`

### Auditoría (`auditoria:get`)

`GET /auditoria/?actor=&recurso=&accion=&desde=&hasta=&limite=`

### Users (admin)

| Método | Ruta |
|--------|------|
| GET | `/roles/` → lista `{name,status}` |
| PUT | `/roles/{name}/status` → `{status:"ACTIVE"|"INACTIVE"}` (no se puede apagar `admin`) |
| POST | `/users/` → PDF |
| GET | `/users/` → lista `{code,username,roles,statususer}` |
| PUT | `/users/{code}/roles`, `/status`, `/password` |
| GET/PUT | `/users/{code}/permisos` |
| DELETE | `/users/{code}` (soft), `/users/{code}/hard` |
| PUT | `/password/` (propia), `/username/` (propio) — sesión + `X-Active-Role`, sin permiso RBAC extra |

---

## 12. Ejemplo fetch (web)

```js
// Login
await fetch(`${API}/login/`, {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ user: codigo, password }),
});

// Cualquier API
await fetch(`${API}/catalogos/grados`, {
  credentials: "include",
  headers: { "X-Active-Role": "admin" },
});
```

---

## 13. Glosario rápido (nombres canónicos)

| En la API / DB | Significa |
|----------------|-----------|
| `modalidad` | Turno (mañana/tarde) |
| `seccion` | A, B, C de un grado |
| `curso` | Asignatura |
| `matricula` | Inscripción del alumno en periodo + sección |
| `grado` | 7.º, 8.º, … |

No usar en código cliente como nombres de entidad: jornada, grupo, materia, inscripción (salvo el JSON SACE, que traduce turno → `jornada`).

---

## 14. Checklist para el equipo frontend

1. Siempre `credentials: 'include'` (o equivalente) tras login.
2. Siempre header `X-Active-Role`.
3. Horarios: preview N veces → **confirm** solo al guardar.
4. Alta usuario: manejar PDF + `X-User-Code` + `X-User-Id` (crear perfil persona si aplica).
5. Respetar permisos por rol (403 = rol/permiso incorrecto, no “API caída”).
6. Bóveda: primero upload, luego guardar `object_key` en matrícula/pago/logo.

---

*Generado a partir del backend Sasha (`internal/routers/appRouter.go` y routers de dominio). Si un endpoint cambia en código, actualizar este documento.*
