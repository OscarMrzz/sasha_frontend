import { expect, loginAs, test } from './fixtures/auth'
import type { ExamenAhora } from '../../services/examenes'

const hoy = new Date().toISOString().slice(0, 10)

const alumno = {
  alumno_id: 'alumno',
  codigo: '1002026701',
  nombre: 'Ana Prueba',
  grado: 'Séptimo',
  seccion: '1',
  meses: ['2026-07'],
  monto: 1000,
  obligaciones: 1,
}
const recibo = {
  id: 'recibo',
  alumno_id: 'alumno',
  alumno_nombre: alumno.nombre,
  alumno_codigo: alumno.codigo,
  responsable_nombre: 'Responsable Prueba',
  anio: 2026,
  mes: 7,
  etiqueta: 'Julio 2026',
  monto: 1000,
  fecha_pago: hoy,
  object_key: 'recibo.png',
  content_type: 'image/png',
  estado: 'sin_revisar',
  created_at: `${hoy}T09:00:00Z`,
}

function examen(id: string, autorizado = false): ExamenAhora {
  return {
    examen_asignacion_id: id,
    examen_horario_id: 'horario',
    es_final: false,
    fecha: hoy,
    bloque_orden: 1,
    hora_inicio: '00:00',
    hora_fin: '23:59',
    seccion_id: 'seccion',
    seccion_nombre: '1',
    grado_nombre: 'Séptimo',
    curso_id: id,
    curso_nombre: id === 'uno' ? 'Español' : 'Matemáticas',
    supervisores: [
      {
        id: 'supervisor',
        maestro_id: 'maestro',
        maestro_nombre: 'Pedro Ramírez',
        seccion_id: 'seccion',
      },
    ],
    alumnos_pagos_pendientes: [{ ...alumno, autorizado_examen: autorizado }],
  }
}

test('admin resuelve pagos y permisos dentro del modo examen @critical', async ({
  page,
}) => {
  await loginAs(page)
  let autorizado = false
  let pagado = false
  let consultas = 0
  let consultasRecibos = 0
  await page.route('**/api/examenes/supervision/ahora**', (route) => {
    consultas++
    const examenes = [examen('uno', autorizado), examen('dos')].map((e) => ({
      ...e,
      alumnos_pagos_pendientes: pagado ? [] : e.alumnos_pagos_pendientes,
    }))
    return route.fulfill({
      json: {
        fecha: hoy,
        hora: '10:00',
        periodo_id: 'periodo',
        periodo_nombre: '2026',
        examenes,
      },
    })
  })
  await page.route(
    '**/api/examenes/uno/alumnos/alumno/autorizacion-mora',
    async (route) => {
      autorizado = route.request().postDataJSON().habilitada
      await route.fulfill({
        json: {
          examen_asignacion_id: 'uno',
          alumno_id: 'alumno',
          habilitada: autorizado,
          tiene_pagos_pendientes: true,
        },
      })
    },
  )
  await page.route('**/api/pagos/recibos?estado=sin_revisar', (route) => {
    consultasRecibos++
    const recibos = pagado || consultasRecibos < 3 ? [] : [recibo]
    return route.fulfill({ json: recibos })
  })
  await page.route('**/api/pagos/recibos/recibo/validar', async (route) => {
    expect(route.request().postDataJSON().estado).toBe('aprobado')
    pagado = true
    await route.fulfill({ json: { ...recibo, estado: 'aprobado' } })
  })
  await page.route('**/api/pagos/mensualidades', (route) =>
    route.fulfill({ json: [] }),
  )
  await page.route('**/api/boveda/object?key=recibo.png', (route) =>
    route.fulfill({ status: 404, json: { message: 'No existe' } }),
  )
  await page.goto('/modo-examen/ahora')
  await expect(page.getByTestId('examen-pagos-contador')).toHaveText('0')
  const uno = page.getByTestId(`examen-autorizar-uno-${alumno.codigo}`)
  const dos = page.getByTestId(`examen-autorizar-dos-${alumno.codigo}`)
  await uno.click()
  await expect(page.getByTestId('examen-autorizacion-confirmar')).toContainText(
    'seguirá en mora',
  )
  await page
    .getByTestId('examen-autorizacion-confirmar')
    .getByRole('button', { name: 'Habilitar rápido', exact: true })
    .click()
  await expect(uno).toHaveText('Deshabilitar rápido')
  await expect(dos).toHaveText('Habilitar rápido')
  await uno.click()
  await page
    .getByTestId('examen-autorizacion-confirmar')
    .getByRole('button', { name: 'Deshabilitar rápido', exact: true })
    .click()
  await expect(uno).toHaveText('Habilitar rápido')
  await uno.click()
  await page
    .getByTestId('examen-autorizacion-confirmar')
    .getByRole('button', { name: 'Habilitar rápido', exact: true })
    .click()
  await expect(uno).toHaveText('Deshabilitar rápido')
  const antes = consultas
  await page.getByTestId('examen-pagos').click()
  await page.getByTestId('examen-pagos-revisar').click()
  await page.getByTestId('examen-recibos-actualizar').click()
  await expect(page.getByTestId('examen-pagos-contador')).toHaveText('1')
  await page
    .getByTestId('examen-recibos-pendientes')
    .getByRole('button', { name: 'Revisar', exact: true })
    .click()
  await page.getByTestId('recibo-validar-estado').selectOption('aprobado')
  await page.getByTestId('recibo-validar-guardar').click()
  await page
    .getByRole('button', { name: 'Guardar', exact: true })
    .last()
    .click()
  await expect(page.getByTestId('examen-pagos-contador')).toHaveText('0')
  await expect(page.getByTestId(`examen-alumno-${alumno.codigo}`)).toHaveCount(
    0,
  )
  await expect.poll(() => consultas).toBe(antes + 1)
  await expect(page).toHaveURL(/\/modo-examen\/ahora$/)
  await page
    .getByTestId('examen-recibos-pendientes')
    .getByRole('button', { name: 'Cerrar', exact: true })
    .click()
  await page.getByTestId('examen-pagos').click()
  await page.getByTestId('examen-pagos-registrar').click()
  await expect(page.getByTestId('pago-alumno-combobox')).toBeVisible()
  await expect(page).toHaveURL(/\/modo-examen\/ahora$/)
})

test('admin puede usar pagos y habilitación rápida desde teléfono', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await loginAs(page)
  let autorizado = false
  await page.route('**/api/examenes/supervision/ahora**', (route) =>
    route.fulfill({
      json: {
        fecha: hoy,
        hora: '10:00',
        periodo_id: 'periodo',
        periodo_nombre: '2026',
        examenes: [examen('uno', autorizado)],
      },
    }),
  )
  await page.route(
    '**/api/examenes/uno/alumnos/alumno/autorizacion-mora',
    async (route) => {
      autorizado = route.request().postDataJSON().habilitada
      await route.fulfill({
        json: {
          examen_asignacion_id: 'uno',
          alumno_id: 'alumno',
          habilitada: autorizado,
          tiene_pagos_pendientes: true,
        },
      })
    },
  )
  await page.route('**/api/pagos/recibos?estado=sin_revisar', (route) =>
    route.fulfill({ json: [recibo] }),
  )
  await page.route('**/api/pagos/mensualidades', (route) =>
    route.fulfill({ json: [] }),
  )

  await page.goto('/modo-examen/ahora')
  await expect(page.getByTestId('examen-pagos')).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)

  await page.getByTestId(`examen-autorizar-uno-${alumno.codigo}`).click()
  await page
    .getByTestId('examen-autorizacion-confirmar')
    .getByRole('button', { name: 'Habilitar rápido', exact: true })
    .click()
  await expect(
    page.getByTestId(`examen-autorizar-uno-${alumno.codigo}`),
  ).toHaveText('Deshabilitar rápido')

  await page.getByTestId('examen-pagos').click()
  await page.getByTestId('examen-pagos-revisar').click()
  await expect(page.getByTestId('examen-recibos-pendientes')).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page
    .getByTestId('examen-recibos-pendientes')
    .getByRole('button', { name: 'Cerrar', exact: true })
    .click()

  await page.getByTestId('examen-pagos').click()
  await page.getByTestId('examen-pagos-registrar').click()
  await expect(page.getByTestId('pago-alumno-combobox')).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})

test('supervisor móvil ve separados los autorizados y no puede conceder permiso', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await loginAs(page, { code: '1002026501' })
  await page.route('**/api/examenes/ahora**', (route) =>
    route.fulfill({
      json: {
        fecha: hoy,
        hora: '10:00',
        periodo_id: 'periodo',
        periodo_nombre: '2026',
        examenes: [examen('uno', true)],
      },
    }),
  )
  await page.goto('/maestro/examenes/ahora')
  const lista = page.getByTestId('examen-autorizados-uno')
  await expect(lista).toContainText(
    'Alumnos con mora autorizados a hacer examen',
  )
  await expect(
    lista.getByTestId(`examen-alumno-${alumno.codigo}`),
  ).toBeVisible()
  await expect(page.getByTestId(`examen-alumno-${alumno.codigo}`)).toHaveCount(
    1,
  )
  await expect(
    page.getByRole('button', { name: 'Habilitar rápido', exact: true }),
  ).toHaveCount(0)
  await expect(page.getByTestId('examen-pagos')).toHaveCount(0)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})
