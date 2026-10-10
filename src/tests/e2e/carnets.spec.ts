import { test, expect, loginAs } from './fixtures/auth'

// data_test.sql: alumna Ana (1002026701) en 7-1. Admin 1002026100 tiene carnet:get;
// el maestro 1002026501 no lo tiene.
const ADMIN = '1002026100'
const MAESTRO = '1002026501'
const ALUMNA_ANA = '1002026701'

test.describe('carnets estudiantiles', () => {
  test('admin: ve el ítem, busca un alumno y arma el carnet', async ({
    page,
  }) => {
    await loginAs(page, { code: ADMIN })

    await page.goto('/dashboard')
    await expect(page.getByRole('link', { name: 'Carnets' })).toBeVisible({
      timeout: 15_000,
    })

    await page.goto('/carnets')
    await expect(page.getByTestId('carnets-buscador')).toBeVisible({
      timeout: 15_000,
    })

    // Sin alumno seleccionado el menú abre igual, pero las opciones están deshabilitadas.
    await page.getByTestId('carnets-descargar').click()
    await expect(page.getByTestId('carnets-pdf')).toBeVisible()
    await expect(page.getByTestId('carnets-pdf')).toBeDisabled()
    await expect(page.getByTestId('carnets-png')).toBeDisabled()
    await expect(page.getByTestId('carnets-svg')).toBeDisabled()
    // Cerramos el menú para poder usar el buscador.
    await page.getByTestId('carnets-descargar').click()
    await expect(page.getByTestId('carnets-pdf')).toBeHidden()

    await page.getByTestId('carnets-buscador').fill(ALUMNA_ANA)
    await page.getByRole('option', { name: new RegExp(ALUMNA_ANA) }).click()

    const carnet = page.getByTestId('carnet-estudiantil')
    await expect(carnet).toBeVisible({ timeout: 15_000 })
    await expect(carnet).toContainText('ANA')
    await expect(carnet).toContainText(ALUMNA_ANA)

    await expect(page.getByTestId('carnets-descargar')).toBeVisible()
    await page.getByTestId('carnets-descargar').click()
    await expect(page.getByTestId('carnets-pdf')).toBeEnabled()
    await expect(page.getByTestId('carnets-png')).toBeEnabled()
    await expect(page.getByTestId('carnets-svg')).toBeEnabled()
  })

  test('maestro sin permiso: no ve el ítem ni puede abrir /carnets', async ({
    page,
  }) => {
    await loginAs(page, { code: MAESTRO })

    await page.goto('/dashboard')
    await expect(page.getByRole('link', { name: 'Carnets' })).toHaveCount(0)

    await page.goto('/carnets')
    await expect(page.getByText(/No tienes permiso/)).toBeVisible({
      timeout: 15_000,
    })
  })
})
