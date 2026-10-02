import { test, expect, loginAs } from './fixtures/auth'

test.describe('tareas staff @critical', () => {
  test('admin sigue viendo una fila por tarea', async ({ page }) => {
    await loginAs(page)
    await page.goto('/tareas')
    await expect(page.getByRole('columnheader', { name: 'Título' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('columnheader', { name: 'Maestro' })).toHaveCount(0)
  })

  test('consejeria ve clases con maestro y abre el modal de tareas en cards', async ({ page }) => {
    await loginAs(page, { code: '1002026602', password: 'Admin123!' })
    await page.goto('/tareas')
    await expect(page.getByRole('columnheader', { name: 'Maestro' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('columnheader', { name: 'Título' })).toHaveCount(0)

    const row = page
      .locator('table.data-table tbody tr')
      .filter({ has: page.locator('td:nth-child(7)', { hasNotText: /^0$/ }) })
      .first()
    await expect(row).toBeVisible()
    const materia = (await row.locator('td:nth-child(2)').innerText()).trim()

    await row.click()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await row.click({ button: 'right' })
    await page.getByTestId('tareas-ctx-ver').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: materia, exact: true })).toBeVisible()
    await dialog.getByRole('button', { name: 'Cerrar' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await row.dblclick()
    await expect(dialog.getByRole('heading', { name: materia, exact: true })).toBeVisible()
    await expect(dialog.getByTestId('clase-tareas-meta')).toContainText('Maestro')
    await expect(dialog.getByRole('heading', { name: /^Esta semana/ })).toBeVisible()
    await expect(dialog.getByRole('heading', { name: /^Todas/ })).toBeVisible()

    const todas = dialog.getByTestId('clase-tareas-todas').locator('.tarea-card')
    await expect(todas.first()).toBeVisible()
    await expect(todas.first().getByTestId('tarea-card-entregas')).toContainText(/\d+ \/ \d+ · \d+ %/)
    const total = await todas.count()

    const tipo = dialog.getByTestId('clase-tareas-tipo')
    const tipoNombre = (await tipo.locator('option').nth(1).innerText()).trim()
    await tipo.selectOption({ label: tipoNombre })
    await expect(todas.first()).toBeVisible()
    expect(await todas.count()).toBeLessThanOrEqual(total)
    for (const card of await todas.all()) {
      await expect(card).toContainText(tipoNombre)
    }
  })
})
