import { test, expect, loginAs } from './fixtures/auth'
import type { Page } from '@playwright/test'

// data_test.sql: caja 603 (contabilidad). Ana 701 tiene mensualidades vencidas sin pagar.
const CAJA = '1002026603'
const DIRECTOR = '1002026601'
const MAESTRO = '1002026501'
const ANA = '1002026701'

async function abrir(page: Page, code: string) {
  await loginAs(page, { code })
  await page.goto('/analitica-pagos')
  await expect(page.getByTestId('analitica-pagos-page')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('analitica-pagos-al-dia')).toBeVisible({ timeout: 15_000 })
}

test.describe('analítica de pagos', () => {
  test('contabilidad ve las tarjetas, los medidores, las columnas y los morosos', async ({ page }) => {
    await abrir(page, CAJA)
    await expect(page.getByRole('link', { name: 'Analítica de pagos' })).toBeVisible()
    await expect(page.getByTestId('analitica-pagos-al-dia')).toContainText('%')
    await expect(page.getByTestId('analitica-pagos-tiempo')).toHaveCount(0)
    await expect(page.getByTestId('analitica-pagos-recaudado')).toContainText('L ')
    await expect(page.getByTestId('analitica-pagos-completos')).toBeVisible()
    await expect(page.getByTestId('analitica-pagos-dona')).toBeVisible()
    await expect(page.getByTestId('analitica-pagos-columnas')).toBeVisible()
    await expect(page.getByTestId('analitica-pagos-barras-grado')).toBeVisible()
    await expect(page.getByTestId('analitica-pagos-medidor-modalidad')).toHaveCount(3)
    await expect(page.getByTestId(`analitica-pagos-moroso-${ANA}`)).toBeVisible()
  })

  test('descargar PDF y Excel', async ({ page }) => {
    await abrir(page, CAJA)
    await expect(page.getByTestId('analitica-pagos-columnas')).toBeVisible()
    for (const [id, ext] of [
      ['analitica-pagos-descargar-pdf', /^analitica-pagos-.*\.pdf$/],
      ['analitica-pagos-descargar-excel', /^analitica-pagos-.*\.xlsx$/],
    ] as const) {
      await page.getByTestId('analitica-pagos-descargar').click()
      const [descarga] = await Promise.all([page.waitForEvent('download'), page.getByTestId(id).click()])
      expect(descarga.suggestedFilename()).toMatch(ext)
    }
  })

  test('director no ve la página (DEC-017)', async ({ page }) => {
    await loginAs(page, { code: DIRECTOR })
    await page.goto('/analitica-pagos')
    await expect(page.getByText('No tienes permiso')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('link', { name: 'Analítica de pagos' })).toHaveCount(0)
  })

  test('maestro no ve el menú ni tiene acceso', async ({ page }) => {
    await loginAs(page, { code: MAESTRO })
    await page.goto('/analitica-pagos')
    await expect(page.getByText('No tienes permiso')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('link', { name: 'Analítica de pagos' })).toHaveCount(0)
    await expect(page.getByTestId('analitica-pagos-page')).toHaveCount(0)
  })
})
