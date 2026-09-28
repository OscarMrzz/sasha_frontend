import { test, expect, loginAs } from './fixtures/auth'

test.describe('horario maestro @smoke', () => {
  test('maestro ve grilla en página con buscador y filtro sección', async ({ page }) => {
    await loginAs(page, { code: '1002026501', password: 'Admin123!' })
    await page.goto('/horarios')
    await expect(page.getByTestId('horario-maestro-view')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('heading', { name: /Mi horario/i })).toBeVisible()
    await expect(page.getByTestId('data-table-add-button')).toHaveCount(0)
    await expect(page.getByText(/Periodo \(lista de versiones\)/i)).toHaveCount(0)

    await expect(page.getByTestId('horario-maestro-horario-view')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('horario-maestro-search')).toBeVisible()
    await expect(page.getByTestId('horario-maestro-filtro-seccion')).toBeVisible()

    const grid = page.getByTestId('horario-maestro-grid')
    await expect(grid).toBeVisible()
    await expect(grid.getByRole('columnheader', { name: 'Hora' })).toBeVisible()
    await expect(grid.getByRole('columnheader', { name: 'Lun' })).toBeVisible()
    await expect(grid.getByRole('columnheader', { name: 'Dom' })).toBeVisible()

    const slot = page.locator('[data-testid^="horario-maestro-slot-"]').first()
    await expect(slot).toBeVisible()
    await slot.click({ button: 'right' })
    await expect(page.getByTestId('horario-maestro-ctx')).toBeVisible()
    await page.getByTestId('horario-maestro-ctx-ver').click()
    await expect(page.getByTestId('horario-maestro-detalle')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/Plan de la semana/i)).toBeVisible()
    await expect(page.getByText(/Tareas del día/i)).toBeVisible()
  })
})
