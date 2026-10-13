import { test, expect, loginAs } from './fixtures/auth'

test.describe('restablecer contraseña @critical', () => {
  test('admin busca un usuario y descarga las credenciales nuevas', async ({ page }) => {
    await loginAs(page)
    await page.goto('/restablecer-password')
    await expect(page.getByRole('heading', { name: 'Restablecer credenciales' })).toBeVisible({
      timeout: 15_000,
    })

    await page.getByTestId('reset-code-input').fill('1002026701')
    await page.getByTestId('reset-buscar').click()

    await expect(page.getByTestId('reset-ficha')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('reset-nombre')).toHaveText(/.+/)

    await page.getByTestId('reset-generar').click()
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Generar y descargar' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/^credenciales-\d+\.pdf$/)
  })

  test('no aparece la página para un rol sin permiso', async ({ page }) => {
    // Maestro: no tiene credenciales:get; la URL no se bloquea pero no se ve el contenido.
    await loginAs(page, { code: '1002026501' })
    await page.goto('/restablecer-password')
    await expect(page.getByText('No tienes permiso')).toBeVisible({ timeout: 15_000 })
  })
})
