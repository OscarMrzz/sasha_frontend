import { test, expect, loginAs } from './fixtures/auth'

test.describe('export sace por maestro @critical', () => {
  test('consejeria abre la hoja de un maestro, cambia de materia y descarga', async ({ page }) => {
    await loginAs(page, { code: '1002026602', password: 'Admin123!' })
    await page.goto('/sace')
    await expect(page.getByRole('columnheader', { name: 'Maestro' })).toBeVisible({ timeout: 15_000 })

    await expect(page.getByRole('columnheader', { name: 'Código' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Clases' })).toHaveCount(0)
    const row = page.locator('table.data-table tbody tr').first()
    await expect(row).not.toContainText('Sin resultados')

    await row.click()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await row.dblclick()
    const hoja = page.getByTestId('sace-hoja')
    await expect(hoja).toBeVisible({ timeout: 15_000 })
    await expect(hoja).toContainText('JORNADA')
    await expect(hoja.getByRole('columnheader', { name: 'PARCIAL I', exact: true })).toBeVisible()
    await expect(hoja.getByRole('columnheader', { name: 'NOTA TOTAL' }).first()).toBeVisible()
    await expect(page.getByTestId('sace-clase-conteo')).toContainText('Clase 1 de')
    await expect(hoja).not.toContainText('Fin del documento')
    await expect(hoja.locator('tbody tr').first().locator('td').nth(1)).toHaveText(/^\d{13}$/)

    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.getByTestId('sace-copiar').click()
    const copiado = await page.evaluate(() => navigator.clipboard.readText())
    const filasHoja = await hoja.locator('tbody tr').count()
    const lineas = copiado.split('\n')
    expect(lineas).toHaveLength(filasHoja)
    expect(lineas[0]).toMatch(/^HND\t\d{13}\t/)
    expect(copiado).not.toContain('NOMBRE')

    const materia = page.getByTestId('sace-filtro-materia')
    if ((await materia.locator('option').count()) > 1) {
      const antes = await hoja.locator('.sace-hoja__encabezado').innerText()
      await materia.selectOption({ index: 1 })
      await expect(hoja.locator('.sace-hoja__encabezado')).not.toHaveText(antes)
    }

    await page.getByTestId('sace-descargar-actual').click()
    const pdf = page.waitForEvent('download')
    await page.getByTestId('sace-descargar-actual-pdf').click()
    expect((await pdf).suggestedFilename()).toMatch(/^sace-.+\.pdf$/)

    await page.getByTestId('sace-descargar-completa').click()
    const xlsx = page.waitForEvent('download')
    await page.getByTestId('sace-descargar-completa-excel').click()
    expect((await xlsx).suggestedFilename()).toMatch(/^sace-.+\.xlsx$/)
  })
})
