import { test, expect, loginAs } from './fixtures/auth'

// TFE2E-35 (DEC-026): recuperaciones por clase y reglas de promoción del periodo.
const PEDRO = '1002026501'
const PADRE_LUIS = '1002026912'
const PADRE_ANA_Y_BRUNO = '1002026913'

test.describe('recuperaciones', () => {
  test('el maestro registra una recuperación de parcial y ve la nota que cuenta', async ({ page }) => {
    await loginAs(page, { code: PEDRO })
    await page.goto('/recuperaciones')
    await expect(page.getByTestId('recuperaciones-page')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('heading', { name: /Recuperaciones · / })).toBeVisible()
    await expect(page.getByTestId('data-table-search')).toHaveAttribute('placeholder', 'Buscar…')

    await page.getByTestId('data-table-add-button').click()
    const modal = page.getByTestId('recuperacion-modal')
    await expect(modal).toBeVisible()

    // Primer parcial terminado con alumnos reprobados.
    const parciales = await page.getByTestId('recuperacion-parcial').locator('option').evaluateAll((os) =>
      os.filter((o) => !o.textContent.includes('en curso')).map((o) => (o as HTMLOptionElement).value),
    )
    const tabla = page.getByTestId('recuperacion-table')
    let encontrado = false
    for (const id of parciales) {
      await page.getByTestId('recuperacion-parcial').selectOption(id)
      await expect(tabla.or(page.getByTestId('recuperacion-sin-alumnos'))).toBeVisible({ timeout: 10_000 })
      if (await tabla.isVisible()) {
        encontrado = true
        break
      }
    }
    expect(encontrado).toBe(true)

    const input = tabla.locator('input[type="number"]').first()
    const fila = tabla.locator('tbody tr').first()
    await input.fill('95')
    await expect(fila.locator('td').last()).toHaveText('95')
    await page.getByTestId('recuperacion-guardar').click()
    await page.getByRole('button', { name: 'Confirmar' }).click()
    await expect(page.getByText('Recuperaciones guardadas')).toBeVisible()
    await expect(page.getByText(/¿Guardar \d+ nota/)).toHaveCount(0)

    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect(modal).toHaveCount(0)
    await expect(page.locator('table.data-table tbody tr', { hasText: '95' }).first()).toBeVisible()
  })

  test('el padre de Luis espera el IV parcial y ve las recuperaciones por parcial', async ({ page }) => {
    // data_test.sql: Luis está al día; el IV parcial no está liberado, así que no aparece y el resultado espera.
    await loginAs(page, { code: PADRE_LUIS })
    await page.getByTestId('responsable-hijos').locator('.hijo-card').first().click()
    await page.getByTestId('padre-tile-calificaciones').click()

    const card = page.getByTestId('resultado-periodo')
    await expect(card).toHaveAttribute('data-estado', 'pendiente', { timeout: 15_000 })
    await expect(card).toContainText('cuando se liberen las notas del IV parcial')
    await expect(page.getByTestId('resultado-cuadro')).toBeVisible()
    await expect(page.getByTestId('resultado-parcial-4')).toHaveCount(0)

    const rec = page.getByTestId('resultado-parcial-1').locator('[data-testid^="resultado-parcial-1-recuperacion-"]')
    await expect(rec.first()).toContainText(/Recuperación \d+ → cuenta \d+/)
  })

  test('padre con dos hijos: el III visible para el que pagó y bloqueado para la que debe', async ({ page }) => {
    // data_test.sql: el padre 913 tiene a Bruno (al día) y a Ana (debe julio y agosto).
    await loginAs(page, { code: PADRE_ANA_Y_BRUNO })
    const hijos = page.getByTestId('responsable-hijos').locator('.hijo-card')
    await expect(hijos).toHaveCount(2, { timeout: 15_000 })

    await hijos.filter({ hasText: 'Bruno' }).click()
    await page.getByTestId('padre-tile-calificaciones').click()
    let bloques = page.getByTestId('resultado-parciales').locator('.parcial-bloque')
    await expect(bloques.first()).toHaveAttribute('data-testid', 'resultado-parcial-3', { timeout: 15_000 })
    await expect(bloques.first()).toHaveAttribute('data-estado', 'visible')
    await expect(page.getByTestId('resultado-parcial-4')).toHaveCount(0)

    await page.goto('/responsable')
    await hijos.filter({ hasText: 'Ana' }).click()
    await page.getByTestId('padre-tile-calificaciones').click()
    bloques = page.getByTestId('resultado-parciales').locator('.parcial-bloque')
    await expect(bloques.first()).toHaveAttribute('data-testid', 'resultado-parcial-3', { timeout: 15_000 })
    await expect(bloques.first()).toHaveAttribute('data-estado', 'bloqueado_pago')
    await expect(bloques.first()).toContainText(/julio/i)
    await expect(page.getByTestId('resultado-parcial-4')).toHaveCount(0)
  })

  test('el admin ve las reglas de promoción y el estado Finalizado del periodo', async ({ page }) => {
    await loginAs(page)
    await page.goto('/catalogos/periodos')
    const fila = page.locator('table.data-table tbody tr').first()
    await expect(fila).toBeVisible({ timeout: 15_000 })
    await fila.click({ button: 'right' })
    await page.getByRole('button', { name: 'Editar' }).click()
    const reglas = page.getByTestId('periodo-reglas')
    await expect(reglas).toBeVisible()
    await expect(page.getByTestId('periodo-nota-minima')).toHaveValue('70')
    await expect(page.getByTestId('periodo-max-reprobadas')).toHaveValue('1')
    await expect(page.getByTestId('periodo-recuperaciones')).toHaveValue('2')
    await expect(page.getByTestId('periodo-tope-parcial')).toHaveValue('100')
    await expect(page.getByTestId('periodo-tope-periodo')).toHaveValue('100')
  })
})
