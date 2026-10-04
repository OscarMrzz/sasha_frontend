import { test, expect, loginAs } from './fixtures/auth'
import type { Page } from '@playwright/test'

// PAN-ADM-31/32, PAN-CON-15. Jorge (710, 7-1) recibe una excusa de lunes 2 a martes 3 de febrero de 2026;
// al final se desactiva para que sus clases vuelvan a ser editables.
const ADMIN = '1002026100'
const CONSEJERIA = '1002026602'
const CAJA = '1002026603'
const ALUMNO = '1002026710'
const TIPO = `E2E tipo ${Date.now()}`
const DESCRIPCION = `e2e ${Date.now()}`

test.describe.configure({ mode: 'serial' })

async function confirmar(page: Page, titulo: string, boton: string) {
  await page.getByRole('dialog', { name: titulo }).getByRole('button', { name: boton, exact: true }).click()
}

test.describe('excusas', () => {
  test('admin crea y desactiva un tipo de excusa', async ({ page }) => {
    await loginAs(page, { code: ADMIN })
    await page.locator('.sidebar-nav').getByTitle('Tipos de excusa').click()
    await expect(page.getByTestId('tipos-excusa-page')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('table.data-table tbody tr', { hasText: 'Visita al doctor' })).toBeVisible()

    await page.getByTestId('data-table-add-button').click()
    await page.getByTestId('tipo-excusa-nombre').fill(TIPO)
    await page.getByTestId('tipo-excusa-guardar').click()
    await confirmar(page, 'Guardar tipo de excusa', 'Guardar')
    await expect(page.getByText('Tipo de excusa creado')).toBeVisible({ timeout: 15_000 })

    await page.getByTestId('data-table-search').fill(TIPO)
    const fila = page.locator('table.data-table tbody tr', { hasText: TIPO })
    await expect(fila).toContainText('Activo')
    await fila.click({ button: 'right' })
    await page.getByTestId('tipos-excusa-ctx').getByRole('button', { name: 'Desactivar' }).click()
    await confirmar(page, 'Desactivar tipo', 'Desactivar')
    await expect(fila).toContainText('Inactivo', { timeout: 15_000 })
  })

  test('consejería registra una excusa por rango y la desactiva', async ({ page }) => {
    await loginAs(page, { code: CONSEJERIA })
    await page.locator('.sidebar-nav').getByTitle('Excusas', { exact: true }).click()
    await expect(page.getByTestId('excusas-page')).toBeVisible({ timeout: 15_000 })

    await page.getByTestId('data-table-add-button').click()
    await expect(page.getByTestId('excusa-guardar')).toBeDisabled()
    await page.getByTestId('excusa-alumno-input').fill(ALUMNO)
    await page.locator('.combobox__option', { hasText: ALUMNO }).first().click()
    await expect(page.getByTestId('excusa-alumno-meta')).toContainText('Séptimo')
    await page.getByTestId('excusa-tipo-input').fill('Visita al doctor')
    await page.locator('.combobox__option', { hasText: 'Visita al doctor' }).first().click()
    await page.getByTestId('excusa-desde').fill('2026-02-02')
    await page.getByTestId('excusa-hasta').fill('2026-02-03')
    await page.getByTestId('excusa-descripcion').fill(DESCRIPCION)
    await page.getByTestId('excusa-guardar').click()
    await confirmar(page, 'Guardar excusa', 'Guardar')
    await expect(page.getByText(/Excusa guardada: \d+ clases/)).toBeVisible({ timeout: 15_000 })

    await page.getByTestId('data-table-search').fill(DESCRIPCION)
    const fila = page.locator('table.data-table tbody tr', { hasText: DESCRIPCION })
    await expect(fila).toContainText('Visita al doctor')
    await expect(fila).toContainText('Activa')

    await fila.click({ button: 'right' })
    await page.getByTestId('excusas-ctx-desactivar').click()
    await confirmar(page, 'Desactivar excusa', 'Desactivar')
    await expect(page.getByText('Excusa desactivada')).toBeVisible({ timeout: 15_000 })
    await expect(fila).toContainText('Desactivada')
    await fila.click({ button: 'right' })
    await expect(page.getByTestId('excusas-ctx-ver')).toBeVisible()
    await expect(page.getByTestId('excusas-ctx-editar')).toHaveCount(0)
  })

  test('consejería no define tipos de excusa', async ({ page }) => {
    await loginAs(page, { code: CONSEJERIA })
    await expect(page.locator('.sidebar-nav').getByTitle('Excusas', { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('.sidebar-nav').getByTitle('Tipos de excusa')).toHaveCount(0)
    await page.goto('/excusas/tipos')
    await expect(page.getByText('No tienes permiso')).toBeVisible({ timeout: 15_000 })
  })

  test('caja no ve excusas', async ({ page }) => {
    await loginAs(page, { code: CAJA })
    await expect(page.locator('.sidebar-nav').getByTitle('Excusas', { exact: true })).toHaveCount(0, { timeout: 15_000 })
    await page.goto('/excusas')
    await expect(page.getByText('No tienes permiso')).toBeVisible({ timeout: 15_000 })
  })
})
