import { test, expect, loginAs } from './fixtures/auth'

// PAN-ADT-24 a 26. data_test.sql: Tomás Temporal 608 (admin_temporal). Contraseña Admin123!.
const TEMPORAL = '1002026608'

test.describe('admin temporal: alumnos, maestros y coordinaciones', () => {
  test('alumnos y maestros en solo lectura', async ({ page }) => {
    await loginAs(page, { code: TEMPORAL })
    for (const [titulo, pagina] of [
      ['Alumnos', 'consejeria-alumnos-page'],
      ['Maestros', 'consejeria-maestros-page'],
    ]) {
      await page.locator('.sidebar-nav').getByTitle(titulo, { exact: true }).click()
      await expect(page.getByTestId(pagina)).toBeVisible({ timeout: 15_000 })
      await expect(page.locator('table.data-table tbody tr').first()).toBeVisible({ timeout: 15_000 })
      await expect(page.getByTestId('data-table-add-button')).toHaveCount(0)
    }
  })

  test('coordinaciones: ve la lista y puede abrir el asistente', async ({ page }) => {
    await loginAs(page, { code: TEMPORAL })
    await page.locator('.sidebar-nav').getByTitle('Coordinaciones').click()
    await expect(page.getByTestId('coordinaciones-page')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('table.data-table tbody')).toContainText('Coordinación de Español')
    await page.getByTestId('data-table-add-button').click()
    await expect(page.getByTestId('coord-titulo')).toBeVisible()
  })
})
