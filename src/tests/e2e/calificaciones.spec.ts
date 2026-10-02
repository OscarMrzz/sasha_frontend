import { test, expect, loginAs } from './fixtures/auth'
import type { Locator, Page } from '@playwright/test'

async function filas(page: Page) {
  const txt = await page.getByTestId('table-row-count').innerText()
  return Number(txt.match(/(\d+) filas/)?.[1])
}

async function avanzado(page: Page, pasos: (modal: Locator) => Promise<void>) {
  await page.getByTestId('calif-avanzado').click()
  const modal = page.getByTestId('calif-avanzado-modal')
  await expect(modal).toBeVisible()
  await pasos(modal)
  await page.getByTestId('calif-avanzado-aplicar').click()
  await expect(modal).toHaveCount(0)
}

test.describe('calificaciones consejeria @critical', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, { code: '1002026602', password: 'Admin123!' })
    await page.goto('/calificaciones')
    await expect(page.getByTestId('calif-resumen')).toBeVisible({ timeout: 20_000 })
  })

  test('selects en Todos, promedio total y filtro por grado-seccion', async ({ page }) => {
    for (const label of ['Grado - sección', 'Parcial', 'Materia']) {
      await expect(page.getByLabel(`Filtrar por ${label}`)).toHaveValue('')
    }
    await expect(page.getByTestId('calif-resumen-promedio')).toHaveText(/\d/)
    await expect(page.getByRole('columnheader', { name: 'Total de puntos' })).toBeVisible()

    const total = await filas(page)
    await page.getByLabel('Filtrar por Grado - sección').selectOption({ index: 1 })
    await expect.poll(() => filas(page)).toBeLessThan(total)
  })

  test('avanzado: vista por parcial, solo reprobados y rango mas de 70', async ({ page }) => {
    await avanzado(page, async (m) => {
      await m.getByTestId('calif-avanzado-seccion-vista').click()
      await m.getByTestId('calif-vista-parcial').check()
    })
    await expect(page.getByRole('columnheader', { name: 'I parcial', exact: true })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Total de puntos' })).toHaveCount(0)

    // Vista total: columnas #, Código, Nombre, Grado - sección, Total, Promedio, Estado.
    const promedios = page.locator('table.data-table tbody tr td:nth-child(6)')
    const estados = page.locator('table.data-table tbody tr td:nth-child(7)')

    await avanzado(page, async (m) => {
      await m.getByTestId('calif-avanzado-seccion-vista').click()
      await m.getByTestId('calif-vista-total').check()
      await m.getByTestId('calif-avanzado-seccion-resultado').click()
      await m.getByTestId('calif-resultado-aprobado').uncheck()
      await m.getByTestId('calif-resultado-sin_nota').uncheck()
    })
    await expect(page.getByTestId('calif-avanzado')).toHaveText('Avanzado (1)')
    await expect(estados.first()).toBeVisible()
    for (const t of await estados.allInnerTexts()) expect(t.trim()).toBe('Reprobado')

    await avanzado(page, async (m) => {
      await page.getByRole('button', { name: 'Restablecer' }).click()
      await m.getByTestId('calif-avanzado-seccion-rango').click()
      await m.getByTestId('calif-rango-70').check()
    })
    await expect(page.getByTestId('calif-avanzado')).toHaveText('Avanzado (1)')
    await expect(promedios.first()).toBeVisible()
    for (const t of await promedios.allInnerTexts()) expect(Number(t)).toBeGreaterThan(70)
  })
})
