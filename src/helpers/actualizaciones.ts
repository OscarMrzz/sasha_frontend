import type {
  ActualizacionInput,
  ActualizacionSistema,
  EstadoActualizacion,
} from '#/services/actualizaciones'

// Etapas en orden de avance: pendiente primero y finalizado al final. Dentro
// de cada etapa se ordena por fecha descendente.
export const ESTADOS_ACTUALIZACION: ReadonlyArray<{
  value: EstadoActualizacion
  label: string
  orden: number
}> = [
  { value: 'pendiente', label: 'Pendiente', orden: 1 },
  { value: 'en_desarrollo', label: 'En desarrollo', orden: 2 },
  { value: 'etapa_pruebas', label: 'Etapa de pruebas', orden: 3 },
  { value: 'finalizado', label: 'Finalizado', orden: 4 },
]

const ORDEN_ESTADO = new Map<EstadoActualizacion, number>(
  ESTADOS_ACTUALIZACION.map((e) => [e.value, e.orden]),
)

export function etiquetaEstado(estado: string): string {
  return ESTADOS_ACTUALIZACION.find((e) => e.value === estado)?.label ?? estado
}

export function formatearFecha(fecha: string): string {
  if (!fecha) return '—'
  const date = new Date(`${fecha}T00:00:00`)
  if (Number.isNaN(date.getTime())) return fecha
  return new Intl.DateTimeFormat('es-HN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export type ColumnaActualizaciones = {
  estado: EstadoActualizacion
  label: string
  items: ActualizacionSistema[]
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** Ordena (etapa descendente y fecha descendente) y filtra por búsqueda. */
export function ordenarActualizaciones(
  lista: ActualizacionSistema[],
  filtros: { busqueda?: string } = {},
): ActualizacionSistema[] {
  const busqueda = normalizar((filtros.busqueda ?? '').trim())
  const visibles = lista.filter((a) => {
    if (!busqueda) return true
    return normalizar(`${a.titulo} ${a.descripcion} ${a.modulo ?? ''}`).includes(busqueda)
  })

  return [...visibles].sort((a, b) => {
    const porEstado = (ORDEN_ESTADO.get(a.estado) ?? 99) - (ORDEN_ESTADO.get(b.estado) ?? 99)
    if (porEstado !== 0) return porEstado
    if (a.fecha !== b.fecha) return a.fecha < b.fecha ? 1 : -1
    if (a.orden !== b.orden) return a.orden - b.orden
    return a.created_at < b.created_at ? 1 : -1
  })
}

/** Devuelve las 4 columnas del tablero (las vacías también), ya ordenadas. */
export function columnasTablero(
  lista: ActualizacionSistema[],
  filtros: { busqueda?: string; estado?: EstadoActualizacion | 'todos' } = {},
): ColumnaActualizaciones[] {
  const ordenadas = ordenarActualizaciones(lista, { busqueda: filtros.busqueda })
  const estado = filtros.estado ?? 'todos'
  return ESTADOS_ACTUALIZACION.filter((e) => estado === 'todos' || e.value === estado).map(
    (e) => ({
      estado: e.value,
      label: e.label,
      items: ordenadas.filter((a) => a.estado === e.value),
    }),
  )
}

export function contarPorEstado(lista: ActualizacionSistema[]): Record<EstadoActualizacion, number> {
  const conteo: Record<EstadoActualizacion, number> = {
    pendiente: 0,
    en_desarrollo: 0,
    etapa_pruebas: 0,
    finalizado: 0,
  }
  for (const a of lista) {
    if (a.estado in conteo) conteo[a.estado] += 1
  }
  return conteo
}

export function validarActualizacion(input: ActualizacionInput): Record<string, string> {
  const errores: Record<string, string> = {}
  const titulo = input.titulo.trim()
  const descripcion = input.descripcion.trim()

  if (!titulo) errores.titulo = 'El título es obligatorio.'
  else if (titulo.length > 160) errores.titulo = 'Máximo 160 caracteres.'

  if (!descripcion) errores.descripcion = 'La descripción es obligatoria.'
  else if (descripcion.length > 4000) errores.descripcion = 'Máximo 4000 caracteres.'

  if (input.estado && !ORDEN_ESTADO.has(input.estado)) {
    errores.estado = 'Estado inválido.'
  }
  if (input.orden !== undefined && input.orden < 0) {
    errores.orden = 'El orden no puede ser negativo.'
  }
  if (input.version && input.version.length > 40) {
    errores.version = 'Máximo 40 caracteres.'
  }
  if (input.modulo && input.modulo.length > 80) {
    errores.modulo = 'Máximo 80 caracteres.'
  }
  return errores
}
