import { test, expect, loginAs } from './fixtures/auth'

// TFE2E-29 (DEC-021): analíticas del maestro, solo sus clases y sin comparar por maestro.
// Pedro 501 da Español.
const PEDRO = '1002026501'

test.describe('maestro: mis analíticas', () => {
  test('entra desde la barra superior y ve el bento de sus clases', async ({ page }) => {
    await loginAs(page, { code: PEDRO })
    await expect(page.getByTestId('maestro-hub')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('top-analiticas').click()
    await expect(page).toHaveURL(/\/maestro\/analiticas/)
    await expect(page.getByTestId('mis-analiticas-page')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('sidebar-collapse')).toHaveCount(0)
    await expect(page.getByTestId('analisis-agrupar')).toContainText('Clase')
    await expect(page.getByTestId('mis-filtros-principales')).toBeVisible()
    await expect(page.getByTestId('analisis-promedio')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('analisis-asistencia')).toBeVisible()
    await expect(page.getByTestId('analisis-cumplimiento')).toBeVisible()
  })

  test('sin maestro en Comparar por ni en Avanzado; materias solo las suyas', async ({ page }) => {
    await loginAs(page, { code: PEDRO })
    await page.goto('/maestro/analiticas')
    await expect(page.getByTestId('analisis-promedio')).toBeVisible({ timeout: 15_000 })

    await page.getByTestId('analisis-agrupar').click()
    await expect(page.getByTestId('analisis-agrupar-maestro')).toHaveCount(0)
    await expect(page.getByTestId('analisis-agrupar-general')).toContainText('Todas mis clases')
    await page.getByTestId('analisis-agrupar-seccion').click()
    await expect(page).toHaveURL(/agrupar=seccion/)

    await page.getByTestId('analisis-avanzado').click()
    await expect(page.getByTestId('avanzado-modal')).toBeVisible()
    await expect(page.getByTestId('avanzado-seccion-maestro_ids')).toHaveCount(0)
    await page.getByTestId('avanzado-seccion-curso_ids').click()
    const materias = page.getByTestId('avanzado-modal').locator('.avanzado__lista li')
    await expect(materias).toHaveCount(1)
    await expect(materias.first()).toContainText('Español')
  })

  test('filtros principales: grado limita secciones y clases; una clase deja un solo grupo', async ({ page }) => {
    await loginAs(page, { code: PEDRO })
    await page.goto('/maestro/analiticas')
    await expect(page.getByTestId('analisis-promedio')).toBeVisible({ timeout: 15_000 })

    const clase = page.getByTestId('mis-filtro-clase')
    const seccion = page.getByTestId('mis-filtro-seccion')
    const todasClases = await clase.locator('option').count()
    const todasSecciones = await seccion.locator('option').count()
    expect(todasClases).toBeGreaterThan(2)

    const grado = page.getByTestId('mis-filtro-grado')
    await grado.selectOption({ index: 1 })
    await expect(page).toHaveURL(/grado_ids/)
    await expect.poll(() => seccion.locator('option').count()).toBeLessThan(todasSecciones)
    await expect.poll(() => clase.locator('option').count()).toBeLessThan(todasClases)

    await seccion.selectOption({ index: 1 })
    await clase.selectOption({ index: 1 })
    await expect(page).toHaveURL(/asignacion_ids/)
    await expect(clase.locator('option:checked')).toContainText('Español')
    await expect(page.getByTestId('analisis-calificaciones')).toBeVisible()

    await grado.selectOption('')
    await expect(grado.locator('option:checked')).toHaveText('Todos')
    await expect.poll(() => seccion.locator('option').count()).toBe(todasSecciones)
  })

  test('el maestro no entra a las estadísticas institucionales', async ({ page }) => {
    await loginAs(page, { code: PEDRO })
    await page.goto('/estadisticas')
    await expect(page.getByText('No tienes permiso')).toBeVisible({ timeout: 15_000 })
  })
})
