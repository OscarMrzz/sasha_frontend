import { test, expect, loginAs } from './fixtures/auth'
import type { Page } from '@playwright/test'

// data_test.sql: caja test 1002026603 = rol `contabilidad` (pagos_config:get|put).
// Periodo activo del fixture (2026) y su primer grado (Séptimo, orden 7).
const CAJA = '1002026603'
const PERIODO_ID = 'a1000000-0000-4000-8000-000000000001'
const GRADO_ID = 'a2000000-0000-4000-8000-000000000007'

const TOAST = 'Configuración de pagos guardada'

test.describe.configure({ mode: 'serial' })

/** Login de contabilidad, va a la página y abre el modal del periodo del fixture. */
async function abrirConfig(page: Page) {
  await loginAs(page, { code: CAJA })
  await page.goto('/configuracion-pagos')
  await expect(page.getByTestId('table-row-count')).toBeVisible({ timeout: 15_000 })
  await page.getByTestId(`config-pagos-btn-${PERIODO_ID}`).click()
  await expect(page.getByTestId('pagos-config-modal')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('pagos-config-dia-pago')).toBeVisible({ timeout: 15_000 })
}

/** Espera el ConfirmDialog de guardado y pulsa su botón «Guardar». */
async function confirmarGuardado(page: Page) {
  await expect(page.getByTestId('pagos-config-confirm')).toBeVisible()
  await page
    .getByTestId('pagos-config-confirm')
    .getByRole('button', { name: 'Guardar', exact: true })
    .click()
}

test.describe('configuracion-pagos @critical', () => {
  test('lista, valida reglas duplicadas y crea la configuración del periodo', async ({ page }) => {
    await abrirConfig(page)

    // Listado estilo registros: título con conteo y buscador «Buscar…».
    await expect(page.getByRole('heading', { name: 'Configuración de pagos' })).toBeVisible()
    await expect(page.getByTestId('data-table-search')).toHaveAttribute('placeholder', 'Buscar…')

    // Días del mes y monto por grado.
    await page.getByTestId('pagos-config-dia-pago').selectOption('12')
    await page.getByTestId('pagos-config-dia-mora').selectOption('15')
    await page.getByTestId(`pagos-config-monto-${GRADO_ID}`).fill('100')

    // Dos reglas de mora y se quita una.
    await page.getByTestId(`pagos-config-agregar-regla-${GRADO_ID}`).click()
    await page.getByTestId(`pagos-config-agregar-regla-${GRADO_ID}`).click()
    await expect(page.getByTestId(`pagos-config-regla-${GRADO_ID}-1`)).toBeVisible()
    await page.getByTestId(`pagos-config-regla-${GRADO_ID}-0-dias`).fill('1')
    await page.getByTestId(`pagos-config-regla-${GRADO_ID}-0-monto`).fill('100')
    await page.getByTestId(`pagos-config-regla-${GRADO_ID}-1-dias`).fill('5')
    await page.getByTestId(`pagos-config-regla-${GRADO_ID}-1-monto`).fill('200')
    await page.getByTestId(`pagos-config-regla-${GRADO_ID}-1-quitar`).click()
    await expect(page.getByTestId(`pagos-config-regla-${GRADO_ID}-1`)).toHaveCount(0)

    // Validación: dos reglas con el mismo `dias` → error y Guardar deshabilitado.
    await page.getByTestId(`pagos-config-agregar-regla-${GRADO_ID}`).click()
    await page.getByTestId(`pagos-config-regla-${GRADO_ID}-1-dias`).fill('1')
    await page.getByTestId(`pagos-config-regla-${GRADO_ID}-1-monto`).fill('200')
    await expect(page.getByTestId('pagos-config-error')).toBeVisible()
    await expect(page.getByTestId('pagos-config-save-button')).toBeDisabled()

    // Corregir el duplicado → se habilita Guardar.
    await page.getByTestId(`pagos-config-regla-${GRADO_ID}-1-dias`).fill('5')
    await expect(page.getByTestId('pagos-config-error')).toHaveCount(0)
    await expect(page.getByTestId('pagos-config-save-button')).toBeEnabled()

    // Guardar (primera config = creación): confirmación, sin retroactivo.
    await page.getByTestId('pagos-config-save-button').click()
    await expect(page.getByTestId('pagos-config-confirm')).toBeVisible()
    await expect(page.getByTestId('pagos-config-retroactivo')).toHaveCount(0)
    await confirmarGuardado(page)
    await expect(page.getByText(TOAST).last()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('pagos-config-modal')).toHaveCount(0)

    // Persistencia al reabrir.
    await page.getByTestId(`config-pagos-btn-${PERIODO_ID}`).click()
    await expect(page.getByTestId('pagos-config-dia-pago')).toHaveValue('12')
    await expect(page.getByTestId('pagos-config-dia-mora')).toHaveValue('15')
    await expect(page.getByTestId(`pagos-config-monto-${GRADO_ID}`)).toHaveValue('100')
    await expect(page.getByTestId(`pagos-config-regla-${GRADO_ID}-0-dias`)).toHaveValue('1')
    await expect(page.getByTestId(`pagos-config-regla-${GRADO_ID}-0-monto`)).toHaveValue('100')
    await expect(page.getByTestId(`pagos-config-regla-${GRADO_ID}-1-dias`)).toHaveValue('5')
    await expect(page.getByTestId(`pagos-config-regla-${GRADO_ID}-1-monto`)).toHaveValue('200')

    // Dirty: sin cambios, Guardar deshabilitado.
    await expect(page.getByTestId('pagos-config-save-button')).toBeDisabled()
  })

  test('editar aplica retroactivo (Sí y No) y persiste', async ({ page }) => {
    await abrirConfig(page)

    // Editar monto → confirmar → aparece el retroactivo → Sí.
    await page.getByTestId(`pagos-config-monto-${GRADO_ID}`).fill('150')
    await expect(page.getByTestId('pagos-config-save-button')).toBeEnabled()
    await page.getByTestId('pagos-config-save-button').click()
    await expect(page.getByTestId('pagos-config-confirm')).toBeVisible()
    await confirmarGuardado(page)
    await expect(page.getByTestId('pagos-config-retroactivo')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('pagos-config-retroactivo-si').click()
    await expect(page.getByText(TOAST).last()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('pagos-config-modal')).toHaveCount(0)

    // Persistió el cambio.
    await page.getByTestId(`config-pagos-btn-${PERIODO_ID}`).click()
    await expect(page.getByTestId(`pagos-config-monto-${GRADO_ID}`)).toHaveValue('150')

    // Editar de nuevo → confirmar → retroactivo → No.
    await page.getByTestId(`pagos-config-monto-${GRADO_ID}`).fill('175')
    await page.getByTestId('pagos-config-save-button').click()
    await expect(page.getByTestId('pagos-config-confirm')).toBeVisible()
    await confirmarGuardado(page)
    await expect(page.getByTestId('pagos-config-retroactivo')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('pagos-config-retroactivo-no').click()
    await expect(page.getByText(TOAST).last()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('pagos-config-modal')).toHaveCount(0)

    await page.getByTestId(`config-pagos-btn-${PERIODO_ID}`).click()
    await expect(page.getByTestId(`pagos-config-monto-${GRADO_ID}`)).toHaveValue('175')
  })
})
