import { test, expect, loginAs } from './fixtures/auth'

// data_test.sql: caja 603 (contabilidad). Ana 701 tiene mensualidades sin pagar y su responsable es 901.
const CAJA = '1002026603'
const ANA = '1002026701'

test.describe('pagos de caja: tabla de mensualidades', () => {
  test('la tabla lista una fila por mensualidad con filtros y Ver', async ({ page }) => {
    await loginAs(page, { code: CAJA })
    await page.goto('/pagos')
    await expect(page.getByTestId('pagos-page')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('data-table-add-button')).toHaveText('Registrar pago')
    await expect(page.getByTestId('data-table-filter-estado')).toBeVisible()
    await page.getByTestId('data-table-search').fill(ANA)

    const filasAna = page.locator('table.data-table tbody tr', { hasText: ANA })
    await expect(filasAna.first()).toBeVisible({ timeout: 15_000 })

    await filasAna.first().click({ button: 'right' })
    await page.getByTestId('pagos-ctx-ver').click()
    await expect(page.getByTestId('pago-ver')).toContainText(ANA)
    await page.getByRole('button', { name: 'Cerrar' }).click()
  })

  test('Editar en un mes sin pagar no deja anular', async ({ page }) => {
    await loginAs(page, { code: CAJA })
    await page.goto('/pagos')
    await page.getByTestId('data-table-search').fill(ANA)
    const sinPagar = page
      .locator('table.data-table tbody tr', { hasText: ANA })
      .filter({ hasText: /Pendiente|En mora/ })
      .first()
    await expect(sinPagar).toBeVisible({ timeout: 15_000 })
    await sinPagar.click({ button: 'right' })
    await page.getByTestId('pagos-ctx-editar').click()
    await expect(page.getByTestId('pago-editar-sin-pago')).toBeVisible()
    await expect(page.getByTestId('pago-anular')).toHaveCount(0)
  })

  test('Registrar pago: el buscador filtra y carga el estado de cuenta', async ({ page }) => {
    await loginAs(page, { code: CAJA })
    await page.goto('/pagos')
    await page.getByTestId('data-table-add-button').click()
    await page.getByTestId('pago-alumno-combobox').fill(ANA)
    const opcion = page.locator('.combobox__option', { hasText: ANA }).first()
    await expect(opcion).toBeVisible({ timeout: 15_000 })
    await opcion.click()

    await expect(page.getByTestId('pago-meses-card')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('pago-responsables')).not.toHaveText('—')
    await expect(page.getByTestId('pago-mes-actual')).not.toHaveText('Al día')
    await expect(page.getByTestId('pago-meses-cobrar')).toBeDisabled()
  })
})
