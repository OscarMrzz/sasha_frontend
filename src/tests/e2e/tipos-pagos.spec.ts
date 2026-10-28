import { test, expect, loginAs } from './fixtures/auth'
import type { Page } from '@playwright/test'

// data_test.sql: contabilidad 1002026603 tiene pagos_config:get|put.
const CAJA = '1002026603'
const MAESTRO = '1002026501'
const PERIODO_ID = 'a1000000-0000-4000-8000-000000000001'

/** Guarda la configuración de pagos resolviendo el diálogo retroactivo si aparece. */
async function guardarConfig(page: Page) {
  await page.getByTestId('pagos-config-save-button').click()
  await page
    .getByTestId('pagos-config-confirm')
    .getByRole('button', { name: 'Guardar', exact: true })
    .click()
  const retro = page.getByTestId('pagos-config-retroactivo-no')
  await page.waitForTimeout(400)
  if (await retro.isVisible().catch(() => false)) await retro.click()
  await expect(page.getByTestId('pagos-config-modal')).toHaveCount(0, { timeout: 15_000 })
}
test.describe.configure({ mode: 'serial' })

async function abrirTipos(page: Page) {
  await loginAs(page, { code: CAJA })
  await page.goto('/tipos-pagos')
  await expect(page.getByTestId('table-row-count')).toBeVisible({ timeout: 15_000 })
  await page.getByTestId(`tipos-pagos-periodo-${PERIODO_ID}`).click({ button: 'right' })
  await page.getByTestId(`tipos-pagos-ctx-ver-${PERIODO_ID}`).click()
  await expect(page.getByTestId('tipos-pago-modal')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('tipos-pago-detalle')).toBeVisible({ timeout: 15_000 })
  const modal = page.getByTestId('tipos-pago-modal')
  await expect(modal.locator('table.data-table tbody tr', { hasText: 'Matrícula' })).toBeVisible()
}

test.describe('tipos-pagos @critical', () => {
  test('lista periodos con sus tipos y meses, sin agregar periodo', async ({ page }) => {
    await loginAs(page, { code: CAJA })
    await page.goto('/tipos-pagos')

    await expect(page.getByRole('heading', { name: 'Tipos pagos' })).toBeVisible()
    await expect(page.getByTestId('data-table-search')).toHaveAttribute('placeholder', 'Buscar…')
    await expect(page.getByTestId(`tipos-pagos-meses-${PERIODO_ID}`)).toBeVisible()
    // No hay botón de agregar periodo en esta página.
    await expect(page.getByRole('button', { name: /Agregar periodo/ })).toHaveCount(0)
  })

  test('el maestro no tiene permiso para tipos pagos', async ({ page }) => {
    await loginAs(page, { code: MAESTRO })
    await page.goto('/tipos-pagos')
    await expect(page.getByText('No tienes permiso')).toBeVisible({ timeout: 15_000 })
  })

  test('crea, edita y elimina un tipo adicional único', async ({ page }) => {
    await abrirTipos(page)
    const modal = page.getByTestId('tipos-pago-modal')
    await expect(modal.locator('table.data-table tbody tr', { hasText: 'Mensualidad' })).toBeVisible()

    await page.getByTestId('tipos-pago-agregar').click()
    await page.getByTestId('tipos-pago-agregar-simple').click()
    await expect(page.getByTestId('tipo-pago-form')).toBeVisible({ timeout: 15_000 })

    await page.getByTestId('tipo-pago-nombre').fill('E2E Paseo')
    await page.getByTestId('tipo-pago-descripcion').fill('Prueba e2e')
    await page.getByTestId('tipo-pago-monto').fill('350')
    await page.getByTestId('tipo-pago-periodicidad-unico').check()
    await page.getByTestId('tipo-pago-fecha').fill('2026-11-30')
    await expect(
      page.getByTestId('tipo-pago-form').getByTestId('tipo-pago-bloquea'),
    ).toBeChecked()
    await page.getByTestId('tipo-pago-guardar').click()
    await page.getByTestId('tipo-pago-confirmar').getByRole('button', { name: 'Crear' }).click()

    const fila = modal.locator('table.data-table tbody tr', { hasText: 'E2E Paseo' })
    await expect(fila).toBeVisible({ timeout: 15_000 })
    await expect(fila.getByTestId('tipo-pago-badge-bloquea')).toBeVisible()

    // Ver: solo lectura desde el menú contextual.
    await fila.click({ button: 'right' })
    await page.getByTestId('tipos-pago-ctx-ver').click()
    await expect(page.getByTestId('tipo-pago-ver')).toBeVisible()
    await page.getByTestId('tipo-pago-ver-modal').getByRole('button', { name: 'Cerrar' }).click()

    // Editar el monto desde el clic derecho.
    await fila.click({ button: 'right' })
    await page.getByTestId('tipos-pago-ctx-editar').click()
    await expect(page.getByTestId('tipo-pago-form')).toBeVisible()
    await page.getByTestId('tipo-pago-monto').fill('400')
    await page.getByTestId('tipo-pago-guardar').click()
    await page.getByTestId('tipo-pago-confirmar').getByRole('button', { name: 'Guardar' }).click()
    await expect(fila).toContainText('L 400', { timeout: 15_000 })

    // Eliminar (soft delete) con confirmación desde el clic derecho.
    await fila.click({ button: 'right' })
    await page.getByTestId('tipos-pago-ctx-eliminar').click()
    await page
      .getByTestId('tipos-pago-confirmar-eliminar')
      .getByRole('button', { name: 'Eliminar' })
      .click()
    await expect(fila).toHaveCount(0, { timeout: 15_000 })
  })

  test('edita el bloqueo de un tipo fijo y lo restaura', async ({ page }) => {
    await abrirTipos(page)
    const modal = page.getByTestId('tipos-pago-modal')
    const fijo = modal.locator('table.data-table tbody tr', { hasText: 'Matrícula' })
    await expect(fijo.getByTestId('tipo-pago-badge-bloquea')).toBeVisible()

    // Los fijos no se eliminan: el menú solo ofrece Ver y Editar.
    await fijo.click({ button: 'right' })
    await expect(page.getByTestId('tipos-pago-ctx-ver')).toBeVisible()
    await expect(page.getByTestId('tipos-pago-ctx-eliminar')).toHaveCount(0)
    await page.getByTestId('tipos-pago-ctx-editar').click()
    await expect(page.getByTestId('tipo-pago-fijo-form')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('tipo-pago-fijo-bloquea').uncheck()
    await page.getByTestId('tipo-pago-fijo-guardar').click()
    await expect(fijo.getByTestId('tipo-pago-badge-no-bloquea')).toBeVisible({ timeout: 15_000 })

    // Restaurar el valor heredado para no dejar el periodo con override.
    await fijo.click({ button: 'right' })
    await page.getByTestId('tipos-pago-ctx-editar').click()
    await page.getByTestId('tipo-pago-fijo-bloquea').check()
    await page.getByTestId('tipo-pago-fijo-guardar').click()
    await expect(fijo.getByTestId('tipo-pago-badge-bloquea')).toBeVisible({ timeout: 15_000 })
  })

  test('marca meses manuales en configuración de pagos y vuelve a automático', async ({ page }) => {
    await loginAs(page, { code: CAJA })
    await page.goto('/configuracion-pagos')
    await expect(page.getByTestId('table-row-count')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId(`config-pagos-btn-${PERIODO_ID}`).click()
    await expect(page.getByTestId('pagos-config-modal')).toBeVisible({ timeout: 15_000 })

    await expect(page.getByTestId('pagos-config-meses-modo-auto')).toBeChecked()
    await page.getByTestId('pagos-config-meses-modo-manual').check()
    await expect(page.getByTestId('pagos-config-meses')).toBeVisible()
    await expect(page.getByTestId('pagos-config-mes-2026-12')).toBeVisible()

    // Desmarcar diciembre y guardar (si el periodo ya tenía config, elige «No» retroactivo).
    await page.getByTestId('pagos-config-mes-2026-12').click()
    await guardarConfig(page)

    // Volver a automático.
    await page.getByTestId(`config-pagos-btn-${PERIODO_ID}`).click()
    await page.getByTestId('pagos-config-meses-modo-auto').check()
    await guardarConfig(page)
  })
})

  test('mensualidad: alterna monto y meses entre general y por grado', async ({ page }) => {
    await abrirTipos(page)
    const modal = page.getByTestId('tipos-pago-modal')
    const fijo = modal.locator('table.data-table tbody tr', { hasText: 'Mensualidad' })
    await fijo.click({ button: 'right' })
    await page.getByTestId('tipos-pago-ctx-editar').click()
    await expect(page.getByTestId('tipo-pago-fijo-form')).toBeVisible({ timeout: 15_000 })

    // Por defecto el monto viene por grado (como hoy): hay un campo por grado.
    await expect(page.getByTestId('tipo-pago-fijo-monto-modo-por_grado')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('tipo-pago-fijo-monto-general')).toHaveCount(0)

    // General: un solo monto y sin tarjetas de grado para el monto.
    await page.getByTestId('tipo-pago-fijo-monto-modo-general').click()
    await expect(page.getByTestId('tipo-pago-fijo-monto-general')).toBeVisible()

    // Por grado otra vez y meses por grado: botones chicos 1..12 bajo cada grado.
    await page.getByTestId('tipo-pago-fijo-monto-modo-por_grado').click()
    await page.getByTestId('tipo-pago-fijo-meses-modo-por_grado').click()
    const compactos = page.locator('.meses-cobro--compacto')
    await expect(compactos.first()).toBeVisible({ timeout: 15_000 })
    await expect(compactos.first().locator('button').first()).toHaveText('1')

    // Meses generales: vuelve el selector grande con nombres.
    await page.getByTestId('tipo-pago-fijo-meses-modo-general').click()
    await expect(page.getByTestId('pagos-config-meses')).toBeVisible()

    await page.getByRole('button', { name: 'Cancelar' }).click()
  })
