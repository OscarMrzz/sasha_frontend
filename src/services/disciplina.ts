import { apiRequest } from '#/lib/api'

export type Acumulacion = 'mes' | 'parcial' | 'periodo' | 'indefinido'

export const ACUMULACIONES: { value: Acumulacion; label: string; ayuda: string }[] = [
  {
    value: 'mes',
    label: 'Por mes',
    ayuda: 'Las veces se cuentan dentro del mismo mes; al cambiar de mes vuelve a la 1.ª vez.',
  },
  {
    value: 'parcial',
    label: 'Por parcial',
    ayuda: 'Las veces se cuentan dentro del mismo parcial; al empezar otro parcial vuelve a la 1.ª vez.',
  },
  {
    value: 'periodo',
    label: 'Por periodo',
    ayuda: 'Las veces se cuentan en todo el periodo académico; el año siguiente vuelve a la 1.ª vez.',
  },
  {
    value: 'indefinido',
    label: 'Indefinido',
    ayuda: 'Se cuentan todas las veces que el alumno lo haya hecho, sin reiniciar nunca.',
  },
]

export const acumulacionLabel = (a: string) => ACUMULACIONES.find((x) => x.value === a)?.label ?? a

export interface NivelFicha {
  nivel: number
  castigo: string
  requiere_dias: boolean
  dias: number | null
}

export interface TipoFicha {
  id: string
  titulo: string
  descripcion: string
  acumulacion: Acumulacion
  status: string
  niveles: NivelFicha[]
  fichas_aplicadas: number
}

export interface TipoFichaInput {
  titulo: string
  descripcion: string
  acumulacion: Acumulacion
  status: string
  niveles: NivelFicha[]
}

export interface AlumnoConFichas {
  codigo: string
  nombre: string
  grado: string
  grado_orden: number
  seccion: string
  modalidad: string
  total_periodo: number
  total_parcial: number
  ultima_fecha: string
  ultimo_tipo: string
  tipos: string[]
  sancionado_hasta: string
}

export interface FichaDisciplinaria {
  id: string
  fecha: string
  tipo_ficha_id: string
  titulo: string
  descripcion: string
  nivel: number
  castigo: string
  dias: number | null
  fecha_inicio: string
  fecha_fin: string
  observaciones: string
  parcial: string
  registrado_por: string
}

export interface AlumnoBusqueda {
  codigo: string
  nombre: string
  grado: string
  seccion: string
  modalidad: string
}

export interface PreviaFicha {
  alumno: AlumnoBusqueda
  tipo_ficha_id: string
  titulo: string
  descripcion: string
  acumulacion: Acumulacion
  ventana_desde: string
  ventana_hasta: string
  ventana_etiqueta: string
  parcial: string
  previas: FichaDisciplinaria[]
  vez: number
  nivel: number
  ultimo_nivel: number
  castigo: string
  requiere_dias: boolean
  dias: number | null
  dias_clase: number[]
  fecha_inicio: string
  fecha_fin: string
}

export interface AplicarFichaInput {
  alumno_codigo: string
  tipo_ficha_id: string
  fecha: string
  dias: number | null
  fecha_inicio: string
  fecha_fin: string
  observaciones: string
}

export async function listTiposFicha(todos = false) {
  return apiRequest<TipoFicha[]>(`/disciplina/tipos${todos ? '?todos=1' : ''}`)
}

export async function createTipoFicha(body: TipoFichaInput) {
  return apiRequest<TipoFicha>('/disciplina/tipos', { method: 'POST', body })
}

export async function updateTipoFicha(id: string, body: TipoFichaInput) {
  return apiRequest<TipoFicha>(`/disciplina/tipos/${id}`, { method: 'PUT', body })
}

export async function listAlumnosConFichas() {
  return apiRequest<AlumnoConFichas[]>('/disciplina/alumnos')
}

export async function listFichasAlumno(code: string) {
  return apiRequest<FichaDisciplinaria[]>(`/disciplina/alumnos/${encodeURIComponent(code)}/fichas`)
}

export async function buscarAlumnosFicha(q: string) {
  return apiRequest<AlumnoBusqueda[]>(`/disciplina/alumnos/buscar?q=${encodeURIComponent(q)}`)
}

export async function getPreviaFicha(alumno: string, tipo: string, fecha: string) {
  const q = new URLSearchParams({ alumno, tipo, fecha })
  return apiRequest<PreviaFicha>(`/disciplina/previa?${q.toString()}`)
}

export async function aplicarFicha(body: AplicarFichaInput) {
  return apiRequest<FichaDisciplinaria>('/disciplina/fichas', { method: 'POST', body })
}

/** Fecha local YYYY-MM-DD. */
export function hoyISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseISO(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

const toISO = (d: Date) => d.toISOString().slice(0, 10)

/** Lunes = 1 … domingo = 7, igual que modalidad_dia. */
export const diaISO = (s: string) => ((parseISO(s).getUTCDay() + 6) % 7) + 1

/** Misma regla que el backend: cuenta `dias` días de clase desde `inicio`; sin días de modalidad, lunes a viernes. */
export function rangoDiasClase(inicio: string, dias: number, diasClase: number[]) {
  const clase = new Set(diasClase.length ? diasClase : [1, 2, 3, 4, 5])
  const fechas: string[] = []
  const t = parseISO(inicio)
  for (let i = 0; fechas.length < dias && i < 3660; i++) {
    const iso = toISO(t)
    if (clase.has(diaISO(iso))) fechas.push(iso)
    t.setUTCDate(t.getUTCDate() + 1)
  }
  return { desde: fechas[0] ?? inicio, hasta: fechas[fechas.length - 1] ?? inicio, fechas }
}

/** Días entre dos fechas (incluidas) que son de clase. */
export function diasClaseEntre(desde: string, hasta: string, diasClase: number[]) {
  if (!desde || !hasta || hasta < desde) return []
  const clase = new Set(diasClase.length ? diasClase : [1, 2, 3, 4, 5])
  const out: string[] = []
  const t = parseISO(desde)
  for (let i = 0; i < 3660; i++) {
    const iso = toISO(t)
    if (iso > hasta) break
    if (clase.has(diaISO(iso))) out.push(iso)
    t.setUTCDate(t.getUTCDate() + 1)
  }
  return out
}

const DIAS_CORTOS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** «Vie 2 oct». */
export function fechaCorta(iso: string) {
  if (!iso) return ''
  const [, m, d] = iso.split('-').map(Number)
  return `${DIAS_CORTOS[diaISO(iso)]} ${d} ${MESES_CORTOS[m - 1]}`
}

/** «02/10/2026». */
export function fechaLarga(iso: string) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export const ordinal = (n: number) => `${n}.ª`
