import { test, expect, entrarComoPadre, loginAs } from './fixtures/auth'

// data_test.sql: caja 603 (contabilidad). Recibos de Ana (julio, sin revisar), Bruno (septiembre,
// aprobado) y Daniel (marzo, denegado). Los archivos del fixture no existen en MinIO.
const CAJA = '1002026603'
const PADRE_ANA = '1002026901'

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

test.describe.serial('recibos de pago en caja', () => {
  test('caja: la bandeja lista los recibos y Ver abre el visor', async ({ page }) => {
    await loginAs(page, { code: CAJA })
    await page.locator('.sidebar-nav').getByTitle('Recibos').click()
    await expect(page).toHaveURL(/\/recibos$/, { timeout: 10_000 })

    const filas = page.locator('table.data-table tbody tr')
    const anaJulio = filas.filter({ hasText: 'Ana' }).filter({ hasText: 'Julio 2026' })
    await expect(anaJulio).toContainText('Sin revisar', { timeout: 15_000 })
    await expect(filas.filter({ hasText: 'Bruno' }).filter({ hasText: 'Septiembre 2026' })).toContainText('Aprobado')
    await expect(filas.filter({ hasText: 'Daniel' }).filter({ hasText: 'Marzo 2026' })).toContainText('Denegado')

    await anaJulio.click({ button: 'right' })
    await page.getByTestId('recibos-ctx-ver').click()
    await expect(page.getByTestId('recibo-visor-error')).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Cerrar' }).click()

    await page.goto('/pagos')
    await expect(page.getByTestId('pagos-ir-recibos')).toBeVisible({ timeout: 15_000 })
  })

  test('padre de Ana envía un recibo diciendo noviembre', async ({ page }) => {
    await entrarComoPadre(page, PADRE_ANA)
    await page.getByTestId('padre-tile-pagos').click()
    await page.getByTestId('padre-subir-recibo').click()
    await page.getByTestId('recibo-input-archivo').setInputFiles({
      name: 'recibo.png',
      mimeType: 'image/png',
      buffer: PNG,
    })
    await page.getByTestId('recibo-mes').selectOption('2026-11')
    await page.getByTestId('recibo-enviar').click()
    await page.getByRole('button', { name: 'Sí, enviar' }).click()
    await expect(page.getByTestId('padre-mes-2026-11')).toContainText('Recibo en revisión', { timeout: 15_000 })
  })

  test('caja corrige el mes a octubre y aprueba', async ({ page }) => {
    await loginAs(page, { code: CAJA })
    await page.goto('/recibos')
    const fila = page.locator('table.data-table tbody tr', { hasText: 'Noviembre 2026' })
    await expect(fila).toContainText('Ana', { timeout: 15_000 })
    await fila.click({ button: 'right' })
    await page.getByTestId('recibos-ctx-validar').click()

    await expect(page.getByTestId('recibo-visor').locator('img')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('recibo-validar-estado').selectOption('aprobado')
    await page.getByTestId('recibo-validar-mes').selectOption('10')
    await expect(page.getByText('Se corregirá el mes: Noviembre 2026 → Octubre 2026.')).toBeVisible()
    await page.getByTestId('recibo-validar-fecha').fill('2026-09-28')
    await page.getByTestId('recibo-validar-obs').fill('El padre marcó noviembre; el recibo es de octubre.')
    await page.getByTestId('recibo-validar-guardar').click()
    await page.getByRole('button', { name: 'Guardar', exact: true }).last().click()

    await expect(page.getByText('Recibo aprobado')).toBeVisible({ timeout: 15_000 })
    const aprobada = page.locator('table.data-table tbody tr', { hasText: 'Octubre 2026' })
    await expect(aprobada.filter({ hasText: 'Ana' })).toContainText('Aprobado', { timeout: 15_000 })
  })

  test('el padre ve octubre pagado y noviembre pendiente', async ({ page }) => {
    await entrarComoPadre(page, PADRE_ANA)
    await page.getByTestId('padre-tile-pagos').click()
    await expect(page.getByTestId('padre-mes-2026-10')).toContainText('Pagado', { timeout: 15_000 })
    await expect(page.getByTestId('padre-mes-2026-11')).toContainText('Pendiente')
    await expect(page.getByTestId('padre-pagos-recibos')).toContainText('Aprobado')
  })
})
