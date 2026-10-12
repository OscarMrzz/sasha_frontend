# Plan de Especificación: Mensajes claros al subir archivos

> Feature `009-errores-subida-archivos` · Frontend Sasha · v1
> Capa: **frontend** (`sasha_fronted/`). No toca backend (su contrato se define en `backend_sasha/spec/003-storage-errores`).

---

## 1. Problema y objetivo

- **Problema.** Al subir una imagen, cualquier fallo muestra el mismo texto genérico del backend («error al subir objeto a MinIO») y en la consola del navegador solo aparece `Failed to load resource: 500`. El usuario no sabe **qué** falló (logo, foto de perfil, fondo) ni **dónde** (front, backend, almacenamiento/credenciales).
- **Objetivo v1.**
  1. Mensaje de UI **contextual por tipo**: «No se pudo cargar el logo de la institución», «...la foto de perfil», «...el fondo de la pantalla de login», etc.
  2. Detalle en la **consola del navegador**: método, url, status, `code` y mensaje de cada respuesta fallida, para diagnosticar la capa.
- **Fuera de alcance.** Cambios de backend; reintentos automáticos; subida múltiple.

### 1.1 Contexto técnico verificado

- `src/lib/api.ts`: `apiRequest` (l.61), `ApiError` (l.10), `userMessageFromError` (l.145), `mensajePorEstado` (l.135).
- `src/services/boveda.ts`: `upload(file, tipo)` (l.18), `BovedaTipo` (l.3-9).
- Sitios de subida que muestran error: `src/routes/_app/configuracion.tsx` (l.64-68, `ImagenField`; tipos `logo_institucion`, `login_fondo`), `src/routes/_app/mi-perfil.tsx` (l.78-84, `perfil_foto`), `src/components/matricula/MatriculaWizard.tsx` (l.495, `perfil_foto`).

---

## 2. Diseño

### 2.1 Consola central (`src/lib/api.ts`)

En `apiRequest`, cuando `!res.ok`, antes de lanzar `ApiError`, un `console.error` con el detalle (aplica a toda la app):

```
[api] POST /boveda/upload → 503 STORAGE_BUCKET_INVALID · El nombre del depósito de archivos no es válido.
```

### 2.2 Mensaje contextual (`src/services/boveda.ts`)

```ts
const ETIQUETA_TIPO: Record<BovedaTipo, string> = {
  perfil_foto: 'la foto de perfil',
  logo_institucion: 'el logo de la institución',
  logo_app: 'el logo de la aplicación',
  login_fondo: 'el fondo de la pantalla de login',
  recibo_pago: 'el recibo',
  documento_matricula: 'el documento de matrícula',
}

export function uploadErrorMessage(err: unknown, tipo: BovedaTipo): string
```

- Construye `No se pudo cargar <etiqueta>.` y le **añade el motivo corto** cuando el backend devuelve un `code` de storage:
  - `STORAGE_BUCKET_INVALID` / `STORAGE_BUCKET_NOT_FOUND` → «El almacenamiento no está bien configurado.»
  - `STORAGE_ACCESS_DENIED` → «El almacenamiento rechazó las credenciales.»
  - `STORAGE_UNREACHABLE` → «No se pudo contactar el almacenamiento.»
  - `STORAGE_NOT_CONFIGURED` → «El almacenamiento de archivos no está disponible.»
- Para errores que no son `ApiError` (red), delega en `userMessageFromError` (p. ej. «No se pudo conectar con el servidor.»).

### 2.3 Uso

- `configuracion.tsx` `ImagenField`: `toast.error(uploadErrorMessage(err, tipo))`.
- `mi-perfil.tsx`: `toast.error(uploadErrorMessage(err, 'perfil_foto'))`.
- `MatriculaWizard.tsx`: el error de `upload` burbujea al `onError` de la mutación; se mapea a `uploadErrorMessage` (o se deja `userMessageFromError` si el catch es genérico).

---

## 3. Archivos

| Archivo | Cambio |
|---|---|
| `src/lib/api.ts` | `console.error` central en respuestas no-ok. |
| `src/services/boveda.ts` | `ETIQUETA_TIPO` + `uploadErrorMessage`. |
| `src/routes/_app/configuracion.tsx` | Usa `uploadErrorMessage(err, tipo)`. |
| `src/routes/_app/mi-perfil.tsx` | Usa `uploadErrorMessage(err, 'perfil_foto')`. |
| `src/components/matricula/MatriculaWizard.tsx` | Usa `uploadErrorMessage` en el error de subida. |
| `playwright.config.ts` | `STORAGE_BUCKET` en el `env` del backend. |

---

## 4. Tests / verificación

- `pnpm lint` / typecheck del front.
- Manual: subir logo con `STORAGE_*` correctas → éxito; forzar un 503 → toast contextual + línea en consola.
