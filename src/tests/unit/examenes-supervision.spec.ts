import { expect, test } from '@playwright/test'
import {
  agruparExamenesSupervision,
  puedeSupervisarExamenes,
} from '../../lib/examenes-supervision'
import type { ExamenAhora, ExamenSupervisor } from '../../services/examenes'

function supervisor(
  id: string,
  nombre: string,
  seccion = '1',
): ExamenSupervisor {
  return {
    id: `${id}-${seccion}`,
    maestro_id: id,
    maestro_nombre: nombre,
    seccion_id: seccion,
  }
}

function examen(
  id: string,
  seccion: string,
  supervisores: ExamenSupervisor[],
): ExamenAhora {
  return {
    examen_asignacion_id: id,
    examen_horario_id: 'horario',
    es_final: false,
    fecha: '2026-11-11',
    bloque_orden: 1,
    hora_inicio: '09:00',
    hora_fin: '10:00',
    seccion_id: seccion,
    seccion_nombre: seccion,
    grado_nombre: 'Séptimo',
    curso_id: 'curso',
    curso_nombre: 'Español',
    supervisores,
    alumnos_pagos_pendientes: [],
  }
}

test('un responsable agrupa sus secciones sin repetir exámenes', () => {
  const a = examen('a', '1', [supervisor('pedro', 'Pedro Ramírez')])
  const b = examen('b', '2', [supervisor('pedro', 'Pedro Ramírez', '2')])
  const grupos = agruparExamenesSupervision([a, b, a])
  expect(grupos).toHaveLength(1)
  expect(grupos[0].responsables).toEqual(['Pedro Ramírez'])
  expect(grupos[0].secciones).toHaveLength(2)
  expect(grupos[0].examenes.map((item) => item.examen_asignacion_id)).toEqual([
    'a',
    'b',
  ])
})

test('la supervisión compartida se agrupa por conjunto sin depender del orden', () => {
  const pedro = supervisor('pedro', 'Pedro Ramírez')
  const ana = supervisor('ana', 'Ana López')
  const grupos = agruparExamenesSupervision([
    examen('a', '1', [pedro, ana, pedro]),
    examen('b', '2', [ana, pedro]),
  ])
  expect(grupos).toHaveLength(1)
  expect(grupos[0].responsables).toEqual(['Ana López', 'Pedro Ramírez'])
  expect(grupos[0].examenes).toHaveLength(2)
})

test('un examen sin supervisor conserva su grupo y no usa el profesor de la materia', () => {
  const grupos = agruparExamenesSupervision([
    { ...examen('a', '1', []), maestro_nombre: 'Docente de la materia' },
  ])
  expect(grupos).toHaveLength(1)
  expect(grupos[0].responsables).toEqual([])
  expect(grupos[0].examenes).toHaveLength(1)
})

test('solo los cuatro roles acordados acceden al modo staff', () => {
  for (const rol of ['admin', 'director', 'consejeria', 'coordinador'])
    expect(puedeSupervisarExamenes([rol])).toBe(true)
  for (const rol of [
    'admin_temporal',
    'maestro',
    'secretaria',
    'alumno',
    'responsable',
  ])
    expect(puedeSupervisarExamenes([rol])).toBe(false)
})
