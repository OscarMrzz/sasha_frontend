import { test, expect, loginAs } from './fixtures/auth'
import type { Page } from '@playwright/test'

// PAN-ADM-26/27 y PAN-CON-14. Cada corrida crea su propio tipo para que las veces empiecen en 1.
// El alumno 706 (Matutina, lunes a viernes) no tiene fichas en data_test.sql. 2026-10-02 es viernes.
const ADMIN = '1002026100'
const CONSEJERIA = '1002026602'
const CAJA = '1002026603'
const ALUMNO = '1002026706'
const VIERNES = '2026-10-02'
const TITULO = `E2E Salida sin permiso ${Date.now()}`

test.describe.configure({ mode: 'serial' })

async function aplicarFicha(page: Page, vez: string) {
  await page.getByTestId('data-table-add-button').click()
  const form = page.getByTestId('ficha-form')
  await expect(form).toBeVisible()

  await page.getByTestId('ficha-alumno-input').fill(ALUMNO)
  await page.locator('.combobox__option', { hasText: ALUMNO }).first().click()
  await expect(page.getByTestId('ficha-alumno-card')).toContainText(ALUMNO)

  await page.getByTestId('ficha-fecha').fill(VIERNES)
  await page.getByTestId('ficha-tipo-input').fill(TITULO)
  await page.locator('.combobox__option', { hasText: TITULO }).first().click()
  await expect(page.getByTestId('ficha-vez')).toContainText(vez, { timeout: 15_000 })
}

async function confirmar(page: Page, titulo: string, boton: string) {
  await page.getByRole('dialog', { name: titulo }).getByRole('button', { name: boton, exact: true }).click()
}

test.describe('fichas disciplinarias', () => {
  test('admin crea un tipo con acumulación por mes y dos niveles', async ({ page }) => {
    await loginAs(page, { code: ADMIN })
    await page.locator('.sidebar-nav').getByTitle('Tipos de ficha').click()
    await expect(page.getByTestId('tipos-ficha-page')).toBeVisible({ timeout: 15_000 })

    await page.getByTestId('data-table-add-button').click()
    await expect(page.getByTestId('tipo-acumulacion-mes')).toBeChecked()

    await page.getByTestId('tipo-titulo').fill(TITULO)
    await page.getByTestId('tipo-descripcion').fill('Salió del aula sin autorización del docente.')
    await page.getByTestId('tipo-nivel-1-castigo').fill('Llamado de atención verbal')
    await expect(page.getByTestId('tipo-nivel-1-dias')).toBeDisabled()

    await page.getByTestId('tipo-agregar-nivel').click()
    await page.getByTestId('tipo-nivel-2-castigo').fill('Suspensión de clases')
    await page.getByTestId('tipo-nivel-2-check').check()
    await expect(page.getByTestId('tipo-nivel-2-dias')).toBeEnabled()
    await page.getByTestId('tipo-nivel-2-dias').fill('3')
    await expect(page.getByTestId('tipo-ficha-form')).toContainText('Desde la 3.ª vez siempre se aplica el último nivel')

    await page.getByTestId('tipo-nivel-2-grip').dragTo(page.getByTestId('tipo-nivel-1'))
    await expect(page.getByTestId('tipo-nivel-1-castigo')).toHaveValue('Suspensión de clases')
    await expect(page.getByTestId('tipo-nivel-1')).toContainText('1.ª vez')
    await expect(page.getByTestId('tipo-nivel-1-dias')).toHaveValue('3')
    await page.getByTestId('tipo-nivel-1-grip').focus()
    await page.keyboard.press('Alt+ArrowDown')
    await expect(page.getByTestId('tipo-nivel-1-castigo')).toHaveValue('Llamado de atención verbal')
    await expect(page.getByTestId('tipo-nivel-2-castigo')).toHaveValue('Suspensión de clases')

    await page.getByTestId('tipo-ficha-guardar').click()
    await confirmar(page, 'Guardar tipo de ficha', 'Guardar')
    await expect(page.getByText('Tipo de ficha creado')).toBeVisible({ timeout: 15_000 })

    await page.getByTestId('data-table-search').fill(TITULO)
    const fila = page.locator('table.data-table tbody tr', { hasText: TITULO })
    await expect(fila).toContainText('Por mes')
    await expect(fila).toContainText('3 días')
  })

  test('consejería aplica la 1.ª y la 2.ª vez; la 2.ª trae los días y salta el fin de semana', async ({ page }) => {
    await loginAs(page, { code: CONSEJERIA })
    await page.locator('.sidebar-nav').getByTitle('Fichas disciplinarias').click()
    await expect(page.getByTestId('disciplina-page')).toBeVisible({ timeout: 15_000 })

    await aplicarFicha(page, '1.ª vez')
    await expect(page.getByTestId('ficha-castigo')).toHaveText('Llamado de atención verbal')
    await expect(page.getByTestId('ficha-dias')).toHaveCount(0)
    await page.getByTestId('ficha-observaciones').fill('Primera falta (e2e).')
    await page.getByTestId('ficha-aplicar').click()
    await confirmar(page, 'Aplicar ficha', 'Aplicar')
    await expect(page.getByText('Ficha aplicada')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('ficha-form')).toHaveCount(0)

    await aplicarFicha(page, '2.ª vez')
    await expect(page.getByTestId('ficha-castigo')).toHaveText('Suspensión de clases')
    await expect(page.getByTestId('ficha-previas')).toContainText('Llamado de atención verbal')
    await expect(page.getByTestId('ficha-dias')).toHaveValue('3')
    await expect(page.getByTestId('ficha-desde')).toHaveValue(VIERNES)
    await expect(page.getByTestId('ficha-hasta')).toHaveValue('2026-10-06')
    await expect(page.getByTestId('ficha-dias-chips').locator('.dia-chip')).toHaveText(['Vie 2 oct', 'Lun 5 oct', 'Mar 6 oct'])

    await page.getByTestId('ficha-dias').fill('4')
    await expect(page.getByTestId('ficha-hasta')).toHaveValue('2026-10-07')
    await page.getByTestId('ficha-dias').fill('3')
    await page.getByTestId('ficha-aplicar').click()
    await confirmar(page, 'Aplicar ficha', 'Aplicar')
    await expect(page.getByText('Ficha aplicada').first()).toBeVisible({ timeout: 15_000 })

    await page.getByTestId('data-table-search').fill(ALUMNO)
    const fila = page.locator('table.data-table tbody tr', { hasText: ALUMNO })
    await expect(fila).toBeVisible({ timeout: 15_000 })
  })

  test('la 3.ª vez repite el último nivel', async ({ page }) => {
    await loginAs(page, { code: CONSEJERIA })
    await page.goto('/disciplina')
    await expect(page.getByTestId('disciplina-page')).toBeVisible({ timeout: 15_000 })
    await aplicarFicha(page, 'se aplica el último nivel (2)')
    await expect(page.getByTestId('ficha-vez')).toContainText('3.ª vez')
    await expect(page.getByTestId('ficha-castigo')).toHaveText('Suspensión de clases')
  })

  test('las fichas se ven en el historial del alumno y en el expediente', async ({ page }) => {
    await loginAs(page, { code: CONSEJERIA })
    await page.goto('/disciplina')
    await page.getByTestId('data-table-search').fill(ALUMNO)
    const fila = page.locator('table.data-table tbody tr', { hasText: ALUMNO })
    await fila.click({ button: 'right' })
    await page.getByTestId('disciplina-ctx-ver').click()
    await expect(page.getByTestId('fichas-alumno-modal')).toContainText(TITULO, { timeout: 15_000 })
    await expect(page.getByTestId('ficha-disc-card').filter({ hasText: TITULO })).toHaveCount(2)
    await page.getByRole('button', { name: 'Cerrar' }).click()

    await page.goto('/consejeria/alumnos')
    await page.getByTestId('data-table-search').fill(ALUMNO)
    const al = page.locator('table.data-table tbody tr', { hasText: ALUMNO })
    await al.click({ button: 'right' })
    await page.getByTestId('consejeria-alumnos-ctx-ver').click()
    const tabla = page.getByTestId('expediente-fichas-tabla')
    await expect(tabla.locator('tbody tr', { hasText: TITULO })).toHaveCount(2, { timeout: 15_000 })
    await expect(tabla).toContainText('Suspensión de clases')
  })

  test('consejería no define tipos de ficha', async ({ page }) => {
    await loginAs(page, { code: CONSEJERIA })
    await expect(page.locator('.sidebar-nav').getByTitle('Fichas disciplinarias')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('.sidebar-nav').getByTitle('Tipos de ficha')).toHaveCount(0)
    await page.goto('/disciplina/tipos')
    await expect(page.getByText('No tienes permiso')).toBeVisible({ timeout: 15_000 })
  })

  test('caja no ve fichas disciplinarias', async ({ page }) => {
    await loginAs(page, { code: CAJA })
    await expect(page.locator('.sidebar-nav').getByTitle('Fichas disciplinarias')).toHaveCount(0, { timeout: 15_000 })
    await page.goto('/disciplina')
    await expect(page.getByText('No tienes permiso')).toBeVisible({ timeout: 15_000 })
  })
})
