import { test, expect, loginAs } from './fixtures/auth'

test.describe('catalogos @critical', () => {
  test('admin puede abrir grados y ver toolbar agregar', async ({ page }) => {
    await loginAs(page)
    await page.getByRole('link', { name: 'Grados' }).click()
    await expect(page).toHaveURL(/catalogos\/grados/)
    await expect(page.getByTestId('data-table-add-button')).toBeVisible({ timeout: 15_000 })
  })

  test('crear grado vía UI', async ({ page }) => {
    await loginAs(page)
    await page.getByRole('link', { name: 'Grados' }).click()
    await expect(page).toHaveURL(/catalogos\/grados/)
    await expect(page.getByTestId('data-table-add-button')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('data-table-add-button').click()
    const nombre = `Grado E2E ${Date.now()}`
    await page.getByTestId('grado-nombre-input').fill(nombre)
    await page.getByTestId('grado-save-button').click()
    const confirm = page.getByRole('button', { name: /Confirmar/i })
    if (await confirm.isVisible().catch(() => false)) {
      await confirm.click()
    }
    await expect(page.getByText(nombre).first()).toBeVisible({ timeout: 15_000 })
  })
})
