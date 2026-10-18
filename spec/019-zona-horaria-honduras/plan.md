# Plan de Especificación: Zona horaria de negocio (América/Tegucigalpa) - Frontend

## 1. Objetivo

Que el frontend calcule "hoy" con la fecha **local del usuario** (Honduras, UTC-6) y nunca con la
fecha UTC del método `toISOString()`, para que no se muestre/seleccione el día siguiente por la
tarde o noche.

## 2. Problema (causa raíz)

Varios cálculos de "hoy" usan `new Date().toISOString().slice(0,10)`, que devuelve la fecha en
**UTC**. A partir de las 18:00 hora Honduras (00:00 UTC) eso devuelve el **día siguiente**.

## 3. Contexto actual (verificado)

| Archivo:línea | Uso | Efecto |
|---|---|---|
| `src/components/horarios/MaestroHorarioView.tsx:23` | `todayISO()` con `toISOString()` → valor inicial de `fechaRef`, input "Semana de" y consulta del horario | **Bug real:** desde las 6 PM abre la semana equivocada |
| `src/helpers/export-sace.ts:37` | fecha en el nombre del archivo | El archivo sale con la fecha de "mañana" |
| `src/helpers/export-analisis.ts:58` | fecha en el nombre del archivo | Igual |
| `src/helpers/export-analitica-pagos.ts:51` | fecha en el nombre del archivo | Igual |

Nota: el resto del front usa correctamente la fecha local del navegador
(`src/lib/fechas-padre.ts:7`, `src/services/personas.ts:276`, etc.). El locale `es-HN` **no** fija
la zona, solo el formato.

## 4. Diseño propuesto

### 4.1 Helper de fecha local

Reutilizar el patrón ya existente (`fechas-padre.ts:7`):

```ts
function hoyLocal(now = new Date()) {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
```

- `MaestroHorarioView.tsx`: cambiar `todayISO()` para que devuelva la fecha local (usar el mismo
  patrón, o importar `hoyISO` de `#/lib/fechas-padre`). El resto de la lógica de semana
  (`fechaDeDia`, con `T12:00:00Z` + `setUTCDate`) queda como está porque ya es coherente.
- Exports: reemplazar `new Date().toISOString().slice(0,10)` por la fecha local para el nombre del
  archivo.

### 4.2 Sin cambios de formato para el usuario

El día mostrado de una tarea (`fecha_entrega`) sigue siendo el string `YYYY-MM-DD` del backend, sin
conversión; ya muestra el día correcto.

## 5. Contratos

No cambia ningún endpoint ni payload.

## 6. Migración

No aplica (frontend).

## 7. Riesgos

- Bajo: son cambios locales de cálculo de fecha. No afecta datos ya guardados.
- Evitar introducir dependencia nueva de fechas; se usa `Date` nativo como el resto del repo.

## 8. Tests

- Verificación manual: a una hora de tarde/noche, abrir el horario del maestro y confirmar que la
  semana inicial es la actual.
- Confirmar que el nombre del export lleva la fecha del día local.

## 9. Fuera de alcance

- Unificar todos los helpers de fecha del repo.
- Cambiar formatos de presentación (`fechaLarga`/`fechaCorta`).
