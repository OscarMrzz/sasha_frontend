import { test, expect, loginAs } from './fixtures/auth'

// PAN-ADM-28 y 29. El admin ve Alumnos y Maestros de consejería en solo lectura (los alumnos se crean
// en Matrícula); Horarios de consejería no es para él. Ana 701 (padre 901), Pedro 501 da Español 7-1.
const ADMIN = '1002026100'
const ANA = '1002026701'
const PEDRO = '1002026501'

test.describe('admin: alumnos y maestros de solo lectura', () => {
  test('el menú suma Alumnos y Maestros y conserva un solo Horarios', async ({ page }) => {
    await loginAs(page, { code: ADMIN })
    const nav = page.locator('.sidebar-nav')
    await expect(nav.getByRole('link', { name: 'Alumnos', exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(nav.getByRole('link', { name: 'Maestros', exact: true })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Horarios', exact: true })).toHaveCount(1)

    await page.goto('/consejeria/horarios')
    await expect(page.getByText('No tienes permiso')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('consejeria-horarios-page')).toHaveCount(0)
  })

  test('alumnos: sin agregar; Ver abre el expediente', async ({ page }) => {
    await loginAs(page, { code: ADMIN })
    await page.locator('.sidebar-nav').getByTitle('Alumnos').click()
    await expect(page.getByTestId('consejeria-alumnos-page')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('data-table-add-button')).toHaveCount(0)

    await page.getByTestId('data-table-search').fill(ANA)
    const ana = page.locator('table.data-table tbody tr', { hasText: ANA })
    await expect(ana).toContainText('Matriculado', { timeout: 15_000 })
    await ana.click({ button: 'right' })
    await expect(page.getByTestId('consejeria-alumnos-ctx').locator('.ctx-menu__item')).toHaveCount(1)
    await page.getByTestId('consejeria-alumnos-ctx-ver').click()

    await expect(page.getByTestId('expediente-alumno')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('expediente-responsables')).toContainText('1002026901')
  })

  test('maestros: sin agregar; Ver muestra la ficha con sus cursos', async ({ page }) => {
    await loginAs(page, { code: ADMIN })
    await page.locator('.sidebar-nav').getByTitle('Maestros').click()
    await expect(page.getByTestId('consejeria-maestros-page')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('data-table-add-button')).toHaveCount(0)

    await page.getByTestId('data-table-search').fill(PEDRO)
    const pedro = page.locator('table.data-table tbody tr', { hasText: PEDRO })
    await expect(pedro).toContainText('Español', { timeout: 15_000 })
    await pedro.click({ button: 'right' })
    await page.getByTestId('consejeria-maestros-ctx-ver').click()
    await expect(page.getByTestId('ficha-maestro-cursos')).toContainText('Español', { timeout: 15_000 })
  })
})
