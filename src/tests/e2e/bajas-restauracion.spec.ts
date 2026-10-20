import type { Page } from '@playwright/test'
import { test, expect, loginAs, cerrarSesion } from './fixtures/auth'

const ALUMNO = '1002026703'

async function buscar(page: Page) {
  await page.getByTestId('data-table-search').fill(ALUMNO)
  await expect(page.getByTestId('table-row-count')).toContainText('1 de', {
    timeout: 15_000,
  })
}

async function abrirMenu(page: Page) {
  await page
    .locator('tbody tr')
    .filter({ hasText: ALUMNO })
    .first()
    .click({ button: 'right' })
}

async function estaDeBaja(page: Page) {
  return (await page.getByText('Dado de baja').count()) > 0
}

async function asegurarActiva(page: Page) {
  await buscar(page)
  if (await estaDeBaja(page)) {
    await abrirMenu(page)
    await page.getByTestId('ctx-restaurar').click()
    await page.getByRole('button', { name: 'Restaurar' }).last().click()
    await expect(page.getByText('Dado de baja')).toHaveCount(0, { timeout: 15_000 })
  }
}

async function darDeBaja(page: Page) {
  await asegurarActiva(page)
  await buscar(page)
  await abrirMenu(page)
  await page.getByTestId('ctx-dar-de-baja').click()
  await page.getByRole('button', { name: 'Dar de baja' }).last().click()
  await expect(page.getByText('Dado de baja')).toBeVisible({ timeout: 15_000 })
}

async function restaurar(page: Page) {
  await buscar(page)
  if (!(await estaDeBaja(page))) return
  await abrirMenu(page)
  await page.getByTestId('ctx-restaurar').click()
  await page.getByRole('button', { name: 'Restaurar' }).last().click()
  await expect(page.getByText('Dado de baja')).toHaveCount(0, { timeout: 15_000 })
}

test.describe('bajas y restauración', () => {
  test('admin da de baja y restaura un alumno desde Usuarios', async ({ page }) => {
    await loginAs(page)
    await page.goto('/usuarios')
    await restaurar(page)
    await darDeBaja(page)
    await restaurar(page)
  })

  test('consejería no ve al alumno de baja en Matrícula', async ({ page }) => {
    await loginAs(page)
    await page.goto('/usuarios')
    await restaurar(page)
    await darDeBaja(page)

    await cerrarSesion(page)
    await loginAs(page, { code: '1002026602' })
    await page.goto('/matricula')
    await page.getByTestId('data-table-search').fill(ALUMNO)
    await expect(page.getByTestId('table-row-count')).toContainText('0 de', {
      timeout: 15_000,
    })

    await cerrarSesion(page)
    await loginAs(page)
    await page.goto('/usuarios')
    await restaurar(page)
  })
})
