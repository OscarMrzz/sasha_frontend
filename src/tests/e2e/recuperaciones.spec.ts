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
    let etiquetaParcial = ''
    for (const id of parciales) {
      await page.getByTestId('recuperacion-parcial').selectOption(id)
      etiquetaParcial = (await page.getByTestId('recuperacion-parcial').locator('option:checked').textContent()) ?? ''
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
    await expect(modal).toHaveCount(0)
    const filasGrupo = page.locator('table.data-table tbody tr')
    await expect(filasGrupo.first()).toBeVisible()
    const etiquetas = await filasGrupo.locator('td').allTextContents()
    expect(new Set(etiquetas).size).toBe(etiquetas.length)

    const filaParcial = filasGrupo.filter({ hasText: etiquetaParcial.trim() }).first()
    await expect(filaParcial).toBeVisible()
    await filaParcial.click({ button: 'right' })
    await page.getByTestId('recuperaciones-ctx-abrir').click()
    await expect(modal).toBeVisible()
    await expect(modal.locator('input[type="number"]').first()).toHaveValue('95')
    await expect(modal.locator('input[type="number"]').first()).toBeDisabled()
    await page.getByRole('button', { name: 'Cerrar' }).click()
    await expect(modal).toHaveCount(0)
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

  test('menú de grupo Abrir/Editar y Abrir fuerza solo lectura', async ({ page }) => {
    await loginAs(page, { code: PEDRO })
    await page.goto('/recuperaciones')
    await expect(page.getByTestId('recuperaciones-page')).toBeVisible({ timeout: 20_000 })

    const fila = page.locator('table.data-table tbody tr').first()
    await expect(fila).toBeVisible({ timeout: 15_000 })
    await fila.click({ button: 'right' })
    await expect(page.getByTestId('recuperaciones-ctx-abrir')).toBeVisible()
    await expect(page.getByTestId('recuperaciones-ctx-editar')).toBeVisible()
    await expect(page.getByTestId('recuperaciones-ctx-eliminar')).toHaveCount(0)

    await page.getByTestId('recuperaciones-ctx-abrir').click()
    const modal = page.getByTestId('recuperacion-modal')
    await expect(modal).toBeVisible()
    // En modo Ver los selectores son de solo lectura.
    await expect(page.getByTestId('recuperacion-tipo')).toBeDisabled()
    if (await page.getByTestId('recuperacion-parcial').count()) {
      await expect(page.getByTestId('recuperacion-parcial')).toBeDisabled()
    } else {
      await expect(page.getByTestId('recuperacion-numero')).toBeDisabled()
    }
    await page.getByRole('button', { name: 'Cerrar' }).click()
    await expect(modal).toHaveCount(0)
  })

  test('Editar permite quitar una nota individual del grupo', async ({ page }) => {
    // Requiere backend + DB local (fixture data_test.sql) con recuperaciones guardadas.
    await loginAs(page, { code: PEDRO })
    await page.goto('/recuperaciones')
    await expect(page.getByTestId('recuperaciones-page')).toBeVisible({ timeout: 20_000 })

    const fila = page.locator('table.data-table tbody tr').first()
    await expect(fila).toBeVisible({ timeout: 15_000 })
    await fila.click({ button: 'right' })
    await page.getByTestId('recuperaciones-ctx-editar').click()
    const modal = page.getByTestId('recuperacion-modal')
    await expect(modal).toBeVisible()
    const inputs = modal.getByTestId('recuperacion-table').locator('input[type="number"]')
    await expect(inputs.first()).toBeVisible({ timeout: 10_000 })
    const values = await inputs.evaluateAll((elements) => elements.map((el) => (el as HTMLInputElement).value))
    const index = values.findIndex((value) => value !== '')
    expect(index).toBeGreaterThanOrEqual(0)
    await inputs.nth(index).fill('')
    await page.getByTestId('recuperacion-guardar').click()
    await page.getByRole('button', { name: 'Confirmar' }).click()
    await expect(page.getByText('Recuperaciones guardadas')).toBeVisible({ timeout: 15_000 })
    await expect(modal).toHaveCount(0)
  })

  test('con el periodo finalizado el menú solo ofrece Abrir', async ({ page }) => {
    // Requiere un periodo finalizado en la BD (data_test.sql deja el IV parcial en curso).
    await loginAs(page, { code: PEDRO })
    await page.goto('/recuperaciones')
    await expect(page.getByTestId('recuperaciones-page')).toBeVisible({ timeout: 20_000 })
    const finalizado = page.getByTestId('recuperaciones-finalizado')
    test.skip((await finalizado.count()) === 0, 'Requiere un periodo finalizado en la BD')

    const fila = page.locator('table.data-table tbody tr').first()
    await expect(fila).toBeVisible({ timeout: 15_000 })
    await fila.click({ button: 'right' })
    await expect(page.getByTestId('recuperaciones-ctx-abrir')).toBeVisible()
    await expect(page.getByTestId('recuperaciones-ctx-editar')).toHaveCount(0)
    await expect(page.getByTestId('recuperaciones-ctx-eliminar')).toHaveCount(0)
  })
})
