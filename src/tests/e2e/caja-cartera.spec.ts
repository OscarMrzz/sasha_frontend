import { test, expect, loginAs } from './fixtures/auth'

// data_test.sql: caja 603 (contabilidad). Ana 701 debe 2 meses vencidos (mora), Daniel 704 debe 1,
// Bruno 702 al día. El responsable de Ana es 901.
const CAJA = '1002026603'
const ANA = '1002026701'

test.describe('cartera de caja: alumnos y padres', () => {
  test('caja ve Alumnos y Padres en el menú y no Matrícula', async ({ page }) => {
    await loginAs(page, { code: CAJA })
    const nav = page.locator('.sidebar-nav')
    await expect(nav.getByTitle('Alumnos')).toBeVisible({ timeout: 15_000 })
    await expect(nav.getByTitle('Padres')).toBeVisible()
    await expect(nav.getByTitle('Matrícula')).toHaveCount(0)
  })

  test('alumnos: estado de pago y Cobrar abre pagos con los meses', async ({ page }) => {
    await loginAs(page, { code: CAJA })
    await page.locator('.sidebar-nav').getByTitle('Alumnos').click()
    await expect(page.getByTestId('caja-alumnos-page')).toBeVisible({ timeout: 15_000 })

    const filas = page.locator('table.data-table tbody tr')
    const buscar = page.getByTestId('data-table-search')
    await buscar.fill('1002026702')
    await expect(filas.filter({ hasText: 'Bruno' }).first()).toContainText('Al día', { timeout: 15_000 })
    await buscar.fill(ANA)
    const ana = filas.filter({ hasText: ANA })
    await expect(ana).toContainText('En mora', { timeout: 15_000 })

    await ana.click({ button: 'right' })
    await page.getByTestId('caja-alumnos-ctx-cobrar').click()
    await expect(page).toHaveURL(/\/pagos/, { timeout: 10_000 })
    await expect(page.getByTestId('pago-meses-card')).toContainText(ANA, { timeout: 15_000 })
    await expect(page.getByTestId('pago-alumno-combobox')).toHaveValue(new RegExp(ANA))
  })

  test('padres: lista hijos con su deuda', async ({ page }) => {
    await loginAs(page, { code: CAJA })
    await page.locator('.sidebar-nav').getByTitle('Padres').click()
    await expect(page.getByTestId('caja-padres-page')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('data-table-search').fill('1002026901')
    const padre = page.locator('table.data-table tbody tr', { hasText: '1002026901' })
    await expect(padre).toContainText('Ana', { timeout: 15_000 })
    await expect(padre).toContainText('En mora')
  })

  test('admin no ve las páginas de cartera', async ({ page }) => {
    await loginAs(page)
    await expect(page.locator('.sidebar-nav').getByTitle('Padres')).toHaveCount(0)
    await page.goto('/alumnos')
    await expect(page.getByText('No tienes permiso')).toBeVisible({ timeout: 15_000 })
  })
})
