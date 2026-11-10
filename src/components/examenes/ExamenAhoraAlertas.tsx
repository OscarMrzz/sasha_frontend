import { useEffect, useMemo, useState } from 'react'
import { Clock } from 'lucide-react'
import { Modal } from '#/components/ui/Modal'
import type { ExamenAhora } from '#/services/examenes'

const AVISO_MS = 5 * 60 * 1000
const INTERVALO_ALARMA_MS = 1800

type SeguimientoExamen = {
  examen: ExamenAhora
  finMs: number
  avisoCincoMinutos: boolean
  avisoAceptado: boolean
  terminado: boolean
  finAceptado: boolean
}

type SeguimientosExamen = Partial<Record<string, SeguimientoExamen>>

type AlertaPendiente = {
  id: string
  examen: ExamenAhora
  restanteMs: number
  terminado: boolean
}

function fechaHoraLocalMs(fecha: string, hora: string): number | null {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const [horas, minutos, segundos = 0] = hora.split(':').map(Number)
  if (![anio, mes, dia, horas, minutos, segundos].every(Number.isFinite))
    return null
  if (
    mes < 1 ||
    mes > 12 ||
    dia < 1 ||
    dia > 31 ||
    horas > 23 ||
    minutos > 59 ||
    segundos > 59
  ) {
    return null
  }
  const fechaHora = new Date(anio, mes - 1, dia, horas, minutos, segundos)
  if (
    fechaHora.getFullYear() !== anio ||
    fechaHora.getMonth() !== mes - 1 ||
    fechaHora.getDate() !== dia
  ) {
    return null
  }
  return Number.isFinite(fechaHora.getTime()) ? fechaHora.getTime() : null
}

function formatoCuentaRegresiva(restanteMs: number) {
  const totalSegundos = Math.max(0, Math.ceil(restanteMs / 1000))
  const minutos = Math.floor(totalSegundos / 60)
  const segundos = totalSegundos % 60
  return `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`
}

function iniciarAlarma(): () => void {
  if (
    typeof window === 'undefined' ||
    typeof window.AudioContext === 'undefined'
  ) {
    return () => undefined
  }

  let contexto: AudioContext
  try {
    contexto = new window.AudioContext()
  } catch {
    return () => undefined
  }

  const sonar = () => {
    try {
      if (contexto.state === 'suspended')
        void contexto.resume().catch(() => undefined)
      const oscilador = contexto.createOscillator()
      const volumen = contexto.createGain()
      oscilador.type = 'sine'
      oscilador.frequency.setValueAtTime(880, contexto.currentTime)
      volumen.gain.setValueAtTime(0.0001, contexto.currentTime)
      volumen.gain.exponentialRampToValueAtTime(
        0.16,
        contexto.currentTime + 0.02,
      )
      volumen.gain.exponentialRampToValueAtTime(
        0.0001,
        contexto.currentTime + 0.24,
      )
      oscilador.connect(volumen)
      volumen.connect(contexto.destination)
      oscilador.start()
      oscilador.stop(contexto.currentTime + 0.25)
    } catch {
      // El navegador puede bloquear Web Audio; el aviso visual sigue activo.
    }
  }

  sonar()
  const intervalo = window.setInterval(sonar, INTERVALO_ALARMA_MS)
  return () => {
    window.clearInterval(intervalo)
    void contexto.close().catch(() => undefined)
  }
}

/** Cuenta los exámenes activos y conserva sus avisos aunque la consulta los retire al terminar. */
export function ExamenAhoraAlertas({ examenes }: { examenes: ExamenAhora[] }) {
  const [ahoraMs, setAhoraMs] = useState(() => Date.now())
  const [seguimientos, setSeguimientos] = useState<SeguimientosExamen>({})

  useEffect(() => {
    const intervalo = window.setInterval(() => setAhoraMs(Date.now()), 1000)
    return () => window.clearInterval(intervalo)
  }, [])

  useEffect(() => {
    setSeguimientos((actuales) => {
      let cambio = false
      const siguientes = { ...actuales }

      for (const examen of examenes) {
        const id = examen.examen_asignacion_id
        const finMs = fechaHoraLocalMs(examen.fecha, examen.hora_fin)
        if (finMs == null) continue

        const anterior = actuales[id]
        const restanteMs = finMs - ahoraMs
        const cambioHorario = anterior != null && anterior.finMs !== finMs
        const base: SeguimientoExamen = anterior
          ? {
              ...anterior,
              examen,
              finMs,
              ...(cambioHorario && !anterior.terminado
                ? { avisoCincoMinutos: false, avisoAceptado: false }
                : {}),
            }
          : {
              examen,
              finMs,
              avisoCincoMinutos: false,
              avisoAceptado: false,
              terminado: false,
              finAceptado: false,
            }

        const actualizado: SeguimientoExamen = {
          ...base,
          avisoCincoMinutos:
            base.avisoCincoMinutos ||
            (restanteMs > 0 && restanteMs <= AVISO_MS),
          terminado: base.terminado || restanteMs <= 0,
        }

        if (
          !anterior ||
          anterior.examen !== examen ||
          anterior.finMs !== actualizado.finMs ||
          anterior.avisoCincoMinutos !== actualizado.avisoCincoMinutos ||
          anterior.avisoAceptado !== actualizado.avisoAceptado ||
          anterior.terminado !== actualizado.terminado ||
          anterior.finAceptado !== actualizado.finAceptado
        ) {
          siguientes[id] = actualizado
          cambio = true
        }
      }

      // La consulta puede retirar los exámenes al llegar la hora de fin.
      // Conservamos su seguimiento y aun así hacemos la transición al aviso final.
      for (const [id, item] of Object.entries(siguientes)) {
        if (item && !item.terminado && item.finMs <= ahoraMs) {
          siguientes[id] = { ...item, terminado: true }
          cambio = true
        }
      }

      return cambio ? siguientes : actuales
    })
  }, [ahoraMs, examenes])

  const seguimientosOrdenados = useMemo(
    () =>
      Object.values(seguimientos)
        .filter((item): item is SeguimientoExamen => Boolean(item))
        .sort((a, b) => a.finMs - b.finMs),
    [seguimientos],
  )
  const contadoresVisibles = seguimientosOrdenados.filter(
    (item) => item.avisoCincoMinutos || item.terminado,
  )
  const alertasPendientes: AlertaPendiente[] = seguimientosOrdenados.flatMap(
    (item) => {
      if (item.terminado && !item.finAceptado) {
        return [
          {
            id: item.examen.examen_asignacion_id,
            examen: item.examen,
            restanteMs: 0,
            terminado: true,
          },
        ]
      }
      if (item.avisoCincoMinutos && !item.avisoAceptado) {
        return [
          {
            id: item.examen.examen_asignacion_id,
            examen: item.examen,
            restanteMs: item.finMs - ahoraMs,
            terminado: false,
          },
        ]
      }
      return []
    },
  )
  const modalAbierto = alertasPendientes.length > 0
  const hayFinalizados = alertasPendientes.some((item) => item.terminado)
  const claveAlarma = alertasPendientes
    .map((item) => `${item.id}:${item.terminado ? 'fin' : 'aviso'}`)
    .join('|')

  useEffect(() => {
    if (!claveAlarma) return
    return iniciarAlarma()
  }, [claveAlarma])

  function aceptarAlertas() {
    const ids = new Set(alertasPendientes.map((item) => item.id))
    setSeguimientos((actuales) => {
      let cambio = false
      const siguientes = { ...actuales }
      for (const id of ids) {
        const item = actuales[id]
        if (!item) continue
        siguientes[id] = item.terminado
          ? { ...item, finAceptado: true }
          : { ...item, avisoAceptado: true }
        cambio = true
      }
      return cambio ? siguientes : actuales
    })
  }

  return (
    <>
      {contadoresVisibles.length > 0 ? (
        <div
          className="examen-tiempo__contadores"
          aria-label="Cuenta regresiva de exámenes"
        >
          {contadoresVisibles.map((item) => (
            <div
              key={item.examen.examen_asignacion_id}
              className={`examen-tiempo__contador${item.terminado ? ' examen-tiempo__contador--finalizado' : ''}`}
              data-testid={`examen-tiempo-contador-${item.examen.examen_asignacion_id}`}
            >
              <span>
                {item.examen.curso_nombre} · {item.examen.grado_nombre}{' '}
                {item.examen.seccion_nombre}
              </span>
              <time
                role="timer"
                aria-label={
                  item.terminado ? 'Tiempo agotado' : 'Tiempo restante'
                }
              >
                {formatoCuentaRegresiva(item.finMs - ahoraMs)}
              </time>
            </div>
          ))}
        </div>
      ) : null}

      <Modal
        open={modalAbierto}
        title={hayFinalizados ? 'Se acabó el tiempo' : 'Quedan 5 minutos'}
        onClose={aceptarAlertas}
        testId="examen-tiempo-modal"
        footer={
          <button
            type="button"
            className="btn btn--primary"
            onClick={aceptarAlertas}
            data-testid="examen-tiempo-aceptar"
          >
            Aceptar
          </button>
        }
      >
        <div className="examen-tiempo__avisos">
          {alertasPendientes.map((item) => (
            <div className="examen-tiempo__aviso" key={item.id}>
              <Clock size={22} aria-hidden />
              <div>
                <strong>{item.examen.curso_nombre}</strong>
                <p>
                  {item.examen.grado_nombre} · Sección{' '}
                  {item.examen.seccion_nombre}
                </p>
                <p
                  className={
                    item.terminado
                      ? 'examen-tiempo__mensaje--finalizado'
                      : undefined
                  }
                >
                  {item.terminado
                    ? 'Se acabó el tiempo del examen.'
                    : `Tiempo restante: ${formatoCuentaRegresiva(item.restanteMs)}`}
                </p>
                <time className="examen-tiempo__reloj-modal" role="timer">
                  {formatoCuentaRegresiva(item.restanteMs)}
                </time>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </>
  )
}
