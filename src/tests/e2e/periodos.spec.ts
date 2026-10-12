import { test, expect, loginAs } from './fixtures/auth'
import type { Page } from '@playwright/test'

// PAN-ADM: periodos con parciales anidados + configuración por periodo.
// Cada corrida usa datos únicos (Date.now()) para no depender del fixture.
const ADMIN = '1002026100'
const NOMBRE = `E2E Periodo ${Date.now()}`

test.describe.configure({ mode: 'serial' })

async function abrirPeriodos(page: Page) {
  await loginAs(page, { code: ADMIN })
  await page.goto('/catalogos/periodos')
  await expect(page.getByTestId('data-table-add-button')).toBeVisible({ timeout: 15_000 })
}

async function confirmar(page: Page, titulo: string, boton: string) {
  await page
    .getByRole('dialog', { name: titulo })
    .getByRole('button', { name: boton, exact: true })
    .click()
}

async function editarFila(page: Page, texto: string) {
  const fila = page.locator('table.data-table tbody tr', { hasText: texto })
  await expect(fila).toBeVisible({ timeout: 15_000 })
  await fila.click({ button: 'right' })
  await page.locator('.ctx-menu__item', { hasText: 'Editar' }).click()
}

test.describe('periodos @critical', () => {
  test('crea un periodo con 3 parciales y fechas derivadas', async ({ page }) => {
    await abrirPeriodos(page)
    await page.getByTestId('data-table-add-button').click()

    await page.getByTestId('periodo-nombre-input').fill(NOMBRE)

    await expect(page.getByTestId('periodo-parcial-1')).toBeVisible()
    await expect(page.getByTestId('periodo-parcial-1-nombre')).toHaveText('I parcial')

    await page.getByTestId('periodo-parcial-agregar').click()
    await page.getByTestId('periodo-parcial-agregar').click()
    await expect(page.getByTestId('periodo-parcial-2-nombre')).toHaveText('II parcial')
    await expect(page.getByTestId('periodo-parcial-3-nombre')).toHaveText('III parcial')

    await page.getByTestId('periodo-parcial-1-inicio').fill('2026-03-01')
    await page.getByTestId('periodo-parcial-1-fin').fill('2026-04-15')
    await page.getByTestId('periodo-parcial-2-inicio').fill('2026-04-16')
    await page.getByTestId('periodo-parcial-2-fin').fill('2026-05-31')
    await page.getByTestId('periodo-parcial-3-inicio').fill('2026-06-01')
    await page.getByTestId('periodo-parcial-3-fin').fill('2026-07-10')

    await page.getByTestId('periodo-parcial-3-nota-maxima').fill('80')

    const derivadas = page.getByTestId('periodo-fechas-derivadas')
    await expect(derivadas).toContainText('2026-03-01')
    await expect(derivadas).toContainText('2026-07-10')

    await page.getByTestId('periodo-save-button').click()
    await confirmar(page, 'Confirmar guardado', 'Confirmar')
    await expect(page.getByText('Periodo creado')).toBeVisible({ timeout: 15_000 })

    await page.getByTestId('data-table-search').fill(NOMBRE)
    await expect(page.locator('table.data-table tbody tr', { hasText: NOMBRE })).toBeVisible({
      timeout: 15_000,
    })
  })

  test('edita el periodo: cambia una nota máxima y quita un parcial', async ({ page }) => {
    await abrirPeriodos(page)
    await page.getByTestId('data-table-search').fill(NOMBRE)
    await editarFila(page, NOMBRE)

    await expect(page.getByTestId('periodo-parcial-3')).toBeVisible()
    await page.getByTestId('periodo-parcial-1-nota-maxima').fill('90')
    await page.getByTestId('periodo-parcial-3-quitar').click()
    await expect(page.getByTestId('periodo-parcial-3')).toHaveCount(0)
    await expect(page.getByTestId('periodo-fechas-derivadas')).toContainText('2026-05-31')

    await page.getByTestId('periodo-save-button').click()
    await confirmar(page, 'Confirmar guardado', 'Confirmar')
    await expect(page.getByText('Periodo actualizado')).toBeVisible({ timeout: 15_000 })

    await page.getByTestId('data-table-search').fill(NOMBRE)
    await editarFila(page, NOMBRE)
    await expect(page.getByTestId('periodo-parcial-2')).toBeVisible()
    await expect(page.getByTestId('periodo-parcial-3')).toHaveCount(0)
    await expect(page.getByTestId('periodo-parcial-1-nota-maxima')).toHaveValue('90')
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click()
  })

  test('configuración no muestra umbrales ni Programa académico SACE', async ({ page }) => {
    await loginAs(page, { code: ADMIN })
    await page.goto('/configuracion')
    await expect(page.getByText('Código SACE institucional')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByLabel('Programa académico SACE')).toHaveCount(0)
    await expect(page.getByLabel('Mínima aprobación')).toHaveCount(0)
    await expect(page.getByLabel('Honor al mérito')).toHaveCount(0)
    await expect(page.getByLabel('Excelencia')).toHaveCount(0)
    await expect(page.getByLabel('Rango bajo')).toHaveCount(0)
  })

  test('grado guarda el Programa académico SACE', async ({ page }) => {
    await loginAs(page, { code: ADMIN })
    await page.goto('/catalogos/grados')
    await expect(page.getByTestId('data-table-add-button')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('data-table-add-button').click()

    const nombre = `Grado SACE E2E ${Date.now()}`
    await page.getByTestId('grado-nombre-input').fill(nombre)
    await page.getByTestId('grado-modalidad-sace').fill('BACHILLERATO TÉCNICO PROFESIONAL EN INFORMÁTICA')
    await page.getByTestId('grado-save-button').click()
    await confirmar(page, 'Confirmar guardado', 'Confirmar')
    await expect(page.getByText('Grado creado')).toBeVisible({ timeout: 15_000 })

    await page.getByTestId('data-table-search').fill(nombre)
    await editarFila(page, nombre)
    await expect(page.getByTestId('grado-modalidad-sace')).toHaveValue(
      'BACHILLERATO TÉCNICO PROFESIONAL EN INFORMÁTICA',
    )
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click()
  })

  test('el menú contextual del periodo ya no ofrece Parciales', async ({ page }) => {
    await abrirPeriodos(page)
    const fila = page.locator('table.data-table tbody tr').first()
    await expect(fila).toBeVisible({ timeout: 15_000 })
    await fila.click({ button: 'right' })
    const menu = page.locator('.ctx-menu')
    await expect(menu).toBeVisible()
    await expect(menu).toContainText('Ver')
    await expect(menu.getByText('Parciales', { exact: true })).toHaveCount(0)
    await expect(page.getByTestId('periodo-ctx-parciales')).toHaveCount(0)
    await page.keyboard.press('Escape')
  })
})
