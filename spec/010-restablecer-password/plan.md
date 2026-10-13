# Plan de Especificación: Restablecer credenciales — Frontend

> Feature `010-restablecer-password` · Frontend Sasha (React 19 + TanStack Start) · v1
> Capa: **frontend** (`sasha_fronted/`).
> Página simple para admin, admin temporal y dev: escribir el código → ver ficha + rol →
> generar contraseña nueva → descargar PDF de credenciales.

---

## 1. Objetivo

- Nueva ruta **`/restablecer-password`** (visible en el menú para `credenciales:get`).
- **Formulario:** input «Código de usuario» + botón buscar. Al encontrar, muestra una ficha:
  nombre completo, código, username, rol(es) y estado.
- **Botón «Generar nueva contraseña»**: confirmación → `POST /users/{code}/reset-password` →
  descarga `credenciales-<code>.pdf` (mismo código, contraseña nueva). Toast con recomendación
  de entrar y cambiar la contraseña.
- **Fuera de alcance:** recuperación por el propio usuario; edición de datos del usuario.

## 2. Permisos y menú

- `helpers/permissions.ts`: `credenciales:get` / `credenciales:post` para `admin` (admin_temporal
  hereda) y `developer`.
- `helpers/nav.ts`: ítem «Restablecer contraseña» (`credenciales:get`, icono `key`).
- `components/layout/nav-icons.tsx`: registrar el icono `key` (`Key` de lucide).

## 3. Contrato con el backend

- `GET /users/{code}/credencial` → `{ code, username, roles[], statususer, nombre_completo }`.
- `POST /users/{code}/reset-password` → `application/pdf` (blob) + header `X-User-Code`.

## 4. Archivos

| Archivo | Cambio |
|---|---|
| `src/services/users.ts` | `getCredencial(code)`, `resetPassword(code): Blob`. |
| `src/routes/_app/restablecer-password.tsx` | Página (form + ficha + botón + descarga). |
| `src/helpers/permissions.ts` | Permisos del recurso `credenciales`. |
| `src/helpers/nav.ts` | Ítem de menú. |
| `src/components/layout/nav-icons.tsx` | Icono `key`. |
| `src/tests/e2e/restablecer-password.spec.ts` | e2e: buscar, ver ficha, generar (descarga). |

## 5. UI (estilo registros/formulario)

- `RequirePermission permission="credenciales:get"`.
- Card con `Field` + `SearchInput` o input de código; botón «Buscar».
- Ficha con `dl` (nombre, código, username, rol, estado) y botón «Generar nueva contraseña»
  (gated con `Can permission="credenciales:post"`), con `ConfirmDialog`.
- Tras la descarga: mensaje «Entregue el PDF al usuario y pídale cambiar la contraseña al entrar.»
- Sin degradados; colores de tokens.

## 6. Tests
- `pnpm generate-routes` (nueva ruta), `tsc --noEmit`, `eslint`.
- e2e: `restablecer-password.spec.ts` (no ejecutable sin DB/backend; se documenta).
