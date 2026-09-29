import { test, expect, loginAs } from './fixtures/auth'
import type { Page } from '@playwright/test'

// TFE2E-13: panel de estadísticas (análisis) para admin, director y consejería.
const DIRECTOR = '1002026601'
const CONSEJERIA = '1002026602'
const MAESTRO = '1002026501'

async function abrir(page: Page, code?: string) {
  await loginAs(page, { code })
  await page.goto('/estadisticas')
  await expect(page.getByTestId('analisis-page')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('analisis-calificaciones')).toBeVisible({ timeout: 15_000 })
}

test.describe('estadísticas: análisis', () => {
  test('admin: bento de calificaciones con extremos, ampliar tarjeta y secciones sobrias', async ({ page }) => {
    await abrir(page)
    await expect(page.getByTestId('analisis-agrupar')).toContainText('Maestro')
    await expect(page.getByTestId('analisis-promedio')).toBeVisible()
    await expect(page.getByTestId('analisis-desviacion')).toBeVisible()
    await expect(page.getByTestId('analisis-general-alto')).toHaveAttribute('data-nivel', /normal|inusual|muy_atipico|insuficiente/)
    await page.getByTestId('analisis-general-alto-ampliar').click()
    await expect(page.getByRole('dialog', { name: 'Dato más alto' })).toBeVisible()
    await page.getByRole('button', { name: 'Cerrar' }).click()
    await expect(page.getByTestId('analisis-general-caja')).toBeVisible()
    await expect(page.getByTestId('analisis-general-barras-fila').first()).toBeVisible()
    await expect(page.getByTestId('analisis-asistencia')).toBeVisible()
    await expect(page.getByTestId('analisis-cumplimiento')).toBeVisible()
  })

  test('caja con los valores del ranking, atípicos de cada lado y ampliar', async ({ page }) => {
    await abrir(page)
    const bajo = page.getByTestId('analisis-general-atipicos-abajo')
    const alto = page.getByTestId('analisis-general-atipicos-arriba')
    await expect(bajo).toBeVisible()
    await expect(alto).toBeVisible()
    // Euceda es el atípico sembrado por abajo del fixture.
    await expect(bajo.getByTestId('analisis-general-atipicos-abajo-fila').first()).toContainText('Euceda')

    // Lo bajo a la izquierda y lo alto a la derecha.
    const cajaBajo = await bajo.boundingBox()
    const cajaAlto = await alto.boundingBox()
    expect(cajaBajo && cajaAlto && cajaBajo.x < cajaAlto.x).toBeTruthy()
    const extBajo = await page.getByTestId('analisis-general-bajo').boundingBox()
    const extAlto = await page.getByTestId('analisis-general-alto').boundingBox()
    expect(extBajo && extAlto && extBajo.x < extAlto.x).toBeTruthy()

    await page.getByRole('button', { name: 'Ampliar Distribución (caja y bigotes)' }).click()
    const modal = page.getByRole('dialog', { name: 'Distribución (caja y bigotes)' })
    await expect(modal).toBeVisible()
    await expect(modal).toContainText('Promedio')
    await expect(modal).toContainText('Máximo')
    await modal.getByRole('button', { name: 'Cerrar' }).click()
    await expect(modal).toBeHidden()
  })

  test('cambiar «comparar por» a alumno y a mes', async ({ page }) => {
    await abrir(page)
    await page.getByTestId('analisis-agrupar').click()
    await page.getByTestId('analisis-agrupar-alumno').click()
    await expect(page).toHaveURL(/agrupar=alumno/)
    await expect(page.getByTestId('analisis-agrupar')).toContainText('Alumno')
    await expect(page.getByTestId('analisis-cumplimiento-aviso')).toBeVisible({ timeout: 15_000 })

    await page.getByTestId('analisis-agrupar').click()
    await page.getByTestId('analisis-agrupar-mes').click()
    await expect(page.getByTestId('analisis-calificaciones-aviso')).toBeVisible({ timeout: 15_000 })
  })

  test('avanzado: filtrar por un maestro y aplicar', async ({ page }) => {
    await abrir(page)
    await page.getByTestId('analisis-avanzado').click()
    const modal = page.getByTestId('avanzado-modal')
    await expect(modal).toBeVisible()
    await page.getByTestId('avanzado-seccion-maestro_ids').click()
    await modal.getByRole('button', { name: 'Ninguno' }).click()
    await expect(page.getByTestId('avanzado-aplicar')).toBeDisabled()
    await modal.locator('.avanzado__check').first().click()
    await page.getByTestId('avanzado-aplicar').click()
    await expect(modal).toBeHidden()
    await expect(page.getByTestId('analisis-avanzado')).toContainText('1')
    await expect(page).toHaveURL(/filtros=/)
  })

  test('descargar PDF y Excel', async ({ page }) => {
    await abrir(page)
    await expect(page.getByTestId('analisis-general-caja')).toBeVisible()
    for (const [id, ext] of [
      ['analisis-descargar-pdf', /\.pdf$/],
      ['analisis-descargar-excel', /\.xlsx$/],
    ] as const) {
      await page.getByTestId('analisis-descargar').click()
      const [descarga] = await Promise.all([page.waitForEvent('download'), page.getByTestId(id).click()])
      expect(descarga.suggestedFilename()).toMatch(ext)
    }
  })

  for (const [rol, code] of [
    ['director', DIRECTOR],
    ['consejería', CONSEJERIA],
  ] as const) {
    test(`${rol} ve el panel`, async ({ page }) => {
      await abrir(page, code)
      await expect(page.getByTestId('analisis-promedio')).toBeVisible()
    })
  }

  test('maestro no tiene acceso', async ({ page }) => {
    await loginAs(page, { code: MAESTRO })
    await page.goto('/estadisticas')
    await expect(page.getByText('No tienes permiso')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('analisis-page')).toHaveCount(0)
  })
})
