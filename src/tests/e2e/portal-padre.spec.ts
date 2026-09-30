import { test, expect, entrarComoPadre } from './fixtures/auth'

// data_test.sql: padre 901 → Ana (mayo pagado; julio y agosto sin pagar, julio con recibo en revisión).
// Padre 902 → Bruno (al día hasta septiembre). Padre 904 → Daniel (recibo de marzo denegado).
const PADRE_ANA = '1002026901'
const PADRE_BRUNO = '1002026902'
const PADRE_DANIEL = '1002026904'

/** PNG de 1×1 para simular la foto del recibo. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

test.describe('portal del padre estilo app', () => {
  test('tareas: todas juntas con la materia y Atrás vuelve al inicio del hijo', async ({ page }) => {
    await entrarComoPadre(page, PADRE_ANA)
    await page.getByTestId('padre-tile-tareas').click()
    await expect(page.getByTestId('padre-tareas')).toBeVisible({ timeout: 15_000 })
    const pendientes = page.getByTestId('padre-tareas-pendientes')
    await expect(pendientes).toBeVisible({ timeout: 15_000 })
    await expect(pendientes.locator('[data-testid^="padre-tarea-"]').first()).toBeVisible()
    await expect(pendientes).toContainText('Español ·')
    await expect(page.getByTestId('padre-tareas-revisadas')).toBeVisible()
    await expect(page.getByTestId('sidebar-collapse')).toHaveCount(0)

    await page.getByTestId('padre-atras').click()
    await expect(page.getByTestId('padre-tiles')).toBeVisible({ timeout: 10_000 })
  })

  test('horario: pestañas por día con la lista de clases', async ({ page }) => {
    await entrarComoPadre(page, PADRE_ANA)
    await page.getByTestId('padre-tile-horario').click()
    await page.getByTestId('padre-horario-dia-1').click()
    const lista = page.getByTestId('padre-horario-lista')
    await expect(lista).toBeVisible({ timeout: 15_000 })
    await expect(lista).toContainText(/Recreo/i)
  })

  test('plan de estudio: lista de materias y detalle de una', async ({ page }) => {
    await entrarComoPadre(page, PADRE_ANA)
    await page.getByTestId('padre-tile-plan').click()
    const materias = page.getByTestId('padre-plan-materias')
    await expect(materias).toBeVisible({ timeout: 15_000 })
    await materias.locator('[data-testid^="padre-plan-materia-"]', { hasText: 'Español' }).click()
    await expect(page.getByTestId('portal-plan-silabo')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('table.data-table')).toHaveCount(0)

    await page.getByTestId('padre-atras').click()
    await expect(page.getByTestId('padre-plan-materias')).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('padre-atras').click()
    await expect(page.getByTestId('padre-tiles')).toBeVisible({ timeout: 10_000 })
  })

  test('pagos: deuda, meses pagados y recibo en revisión', async ({ page }) => {
    await entrarComoPadre(page, PADRE_ANA)
    await expect(page.getByTestId('padre-tile-pagos')).toContainText(/Debe 2 meses/, { timeout: 15_000 })
    await page.getByTestId('padre-tile-pagos').click()

    await expect(page.getByTestId('padre-pagos-deuda')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('padre-subir-recibo')).toBeEnabled()
    await expect(page.getByTestId('padre-mes-2026-2')).toContainText('Pagado')
    await expect(page.getByTestId('padre-mes-2026-5')).toContainText('Pagado')
    await expect(page.getByTestId('padre-mes-2026-8')).toContainText('Debe')
    await expect(page.getByTestId('padre-mes-2026-7')).toContainText('Recibo en revisión')
    await expect(page.getByTestId('padre-pagos-recibos')).toContainText('Recibo de Julio 2026')
  })

  test('pagos: el padre sube la foto del recibo y el mes queda en revisión', async ({ page }) => {
    await entrarComoPadre(page, PADRE_BRUNO)
    await page.getByTestId('padre-tile-pagos').click()
    await expect(page.getByTestId('padre-pagos-proximo')).toContainText('Octubre 2026', { timeout: 15_000 })

    await page.getByTestId('padre-subir-recibo').click()
    await expect(page.getByTestId('recibo-enviar')).toBeDisabled()
    await page.getByTestId('recibo-input-archivo').setInputFiles({
      name: 'recibo-octubre.png',
      mimeType: 'image/png',
      buffer: PNG,
    })
    await expect(page.getByTestId('recibo-preview')).toContainText('recibo-octubre.png')
    await expect(page.getByTestId('recibo-mes')).toHaveValue('2026-10')
    await page.getByTestId('recibo-enviar').click()
    await page.getByRole('button', { name: 'Sí, enviar' }).click()

    await expect(page.getByText('Recibo enviado')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('padre-mes-2026-10')).toContainText('Recibo en revisión', { timeout: 15_000 })
    await expect(page.getByTestId('padre-pagos-recibos')).toContainText('Recibo de Octubre 2026')
  })

  test('pagos: el recibo denegado muestra el motivo', async ({ page }) => {
    await entrarComoPadre(page, PADRE_DANIEL)
    await page.getByTestId('padre-tile-pagos').click()
    const recibos = page.getByTestId('padre-pagos-recibos')
    await expect(recibos).toContainText('Denegado', { timeout: 15_000 })
    await expect(recibos).toContainText('Motivo: La foto no se lee')
  })
})
