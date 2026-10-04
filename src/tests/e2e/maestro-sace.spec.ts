import { test, expect, loginAs } from './fixtures/auth'

// TFE2E-34 (DEC-025): el maestro abre su propio SACE desde Inicio en una página; sin lista ni filtro de maestros.
const PEDRO = '1002026501'

test.describe('maestro: mi SACE', () => {
  test('el botón SACE de General lleva a la página Mi SACE con solo sus clases', async ({ page }) => {
    await loginAs(page, { code: PEDRO })
    await expect(page.getByTestId('maestro-hub-general')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('hub-sace').click()

    await expect(page).toHaveURL(/\/maestro\/sace$/)
    const pagina = page.getByTestId('mi-sace-page')
    await expect(pagina).toBeVisible()
    await expect(pagina.getByRole('heading', { name: 'Mi SACE' })).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByTestId('sidebar-collapse')).toHaveCount(0)

    const hoja = page.getByTestId('sace-hoja')
    await expect(hoja).toBeVisible({ timeout: 15_000 })
    await expect(hoja).toContainText('JORNADA')
    await expect(page.getByTestId('sace-filtro-materia')).toBeVisible()
    await expect(page.getByTestId('sace-filtro-grado')).toBeVisible()
    await expect(page.getByTestId('sace-filtro-seccion')).toBeVisible()
    await expect(page.getByTestId('sace-clase-conteo')).toContainText(/Clase 1 de [1-9]/)
    await expect(page.getByTestId('sace-copiar')).toBeVisible()

    const materias = page.getByTestId('sace-filtro-materia').locator('option')
    await expect(materias).toHaveCount(1)
    await expect(materias.first()).toHaveText('Español')
    await expect(pagina.getByRole('columnheader', { name: 'Maestro' })).toHaveCount(0)

    await page.getByTestId('sace-descargar-actual').click()
    const pdf = page.waitForEvent('download')
    await page.getByTestId('sace-descargar-actual-pdf').click()
    expect((await pdf).suggestedFilename()).toMatch(/^sace-.+\.pdf$/)
  })

  test('el maestro no entra a la lista de maestros de SACE', async ({ page }) => {
    await loginAs(page, { code: PEDRO })
    await page.goto('/sace')
    await expect(page.getByText('No tienes permiso')).toBeVisible({ timeout: 15_000 })
  })
})
