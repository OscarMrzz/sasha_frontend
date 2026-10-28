import type {
  OpcionAlumno,
  OpcionCatalogo,
  OpcionSeccion,
  TipoPagoRegla,
  TipoPagoReglaInput,
} from '#/services/pagos-tipos'

export type OpcionesDestino = {
  modalidades: OpcionCatalogo[]
  grados: OpcionCatalogo[]
  secciones: OpcionSeccion[]
  alumnos: OpcionAlumno[]
  cursos: OpcionCatalogo[]
}

const nombreGrado = (id: string | null, grados: OpcionCatalogo[]) =>
  grados.find((g) => g.id === id)?.nombre ?? 'grado'

const nombreModalidad = (id: string | null, modalidades: OpcionCatalogo[]) =>
  modalidades.find((m) => m.id === id)?.nombre ?? 'modalidad'

const nombreSeccion = (id: string | null, secciones: OpcionSeccion[]) => {
  const s = secciones.find((x) => x.id === id)
  return s ? `${s.grado_nombre} · ${s.nombre}` : 'sección'
}

const nombreAlumno = (id: string | null, alumnos: OpcionAlumno[]) => {
  const a = alumnos.find((x) => x.id === id)
  return a ? `${a.nombre} (${a.codigo})` : 'alumno'
}

const nombreCurso = (id: string | null, cursos: OpcionCatalogo[]) =>
  cursos.find((c) => c.id === id)?.nombre ?? 'curso'

/** Texto legible de una regla: "Grado 7mo · Sección 1". */
export function etiquetaRegla(regla: TipoPagoReglaInput, opciones: OpcionesDestino): string {
  const partes: string[] = []
  if (regla.modalidad_id) partes.push(nombreModalidad(regla.modalidad_id, opciones.modalidades))
  if (regla.grado_id) partes.push(nombreGrado(regla.grado_id, opciones.grados))
  if (regla.seccion_id) partes.push(nombreSeccion(regla.seccion_id, opciones.secciones))
  if (regla.alumno_id) partes.push(nombreAlumno(regla.alumno_id, opciones.alumnos))
  if (regla.curso_id) partes.push(nombreCurso(regla.curso_id, opciones.cursos))
  return partes.length > 0 ? partes.join(' · ') : 'Regla vacía'
}

/** Resumen del destino: sin reglas = todos; varias = OR. */
export function resumenReglas(reglas: TipoPagoRegla[] | TipoPagoReglaInput[]): string {
  if (reglas.length === 0) return 'Todos los alumnos del periodo'
  if (reglas.length === 1) return '1 regla de destino'
  return `${reglas.length} reglas de destino (se aplica la que cumpla)`
}

/** Clave de deduplicación de una regla. */
export function claveRegla(r: TipoPagoReglaInput): string {
  return [r.modalidad_id, r.grado_id, r.seccion_id, r.alumno_id, r.curso_id]
    .map((v) => v ?? '-')
    .join('|')
}

/** Valida el formulario de un tipo adicional. Devuelve el primer error o ''. */
export function validarTipoAdicional(input: {
  nombre: string
  monto: string
  esPeriodico: boolean
  fechaVencimiento: string
}): string {
  if (!input.nombre.trim()) return 'El nombre del tipo de pago es obligatorio.'
  if (Array.from(input.nombre.trim()).length > 100) return 'El nombre es demasiado largo.'
  const monto = Number(input.monto)
  if (!Number.isFinite(monto) || monto < 0) return 'La cantidad no puede ser negativa.'
  if (!input.esPeriodico && !input.fechaVencimiento) return 'Indica la fecha de vencimiento.'
  return ''
}
