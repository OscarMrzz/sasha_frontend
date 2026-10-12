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
  test('lista, valida montos y crea la configuración del periodo', async ({ page }) => {
    await abrirConfig(page)

    // Listado estilo registros: título con conteo y buscador «Buscar…».
    await expect(page.getByRole('heading', { name: 'Configuración de pagos' })).toBeVisible()
    await expect(page.getByTestId('data-table-search')).toHaveAttribute('placeholder', 'Buscar…')

    // Solo día de pago (la mora se cuenta desde el vencimiento: ya no hay día de mora).
    await expect(page.getByTestId('pagos-config-dia-mora')).toHaveCount(0)
    await page.getByTestId('pagos-config-dia-pago').selectOption('12')
    await page.getByTestId(`pagos-config-monto-${GRADO_ID}`).fill('100')

    // Dos reglas de mora: los días se numeran solos (1 y 2); solo se rellenan montos.
    await page.getByTestId(`pagos-config-agregar-regla-${GRADO_ID}`).click()
    await page.getByTestId(`pagos-config-agregar-regla-${GRADO_ID}`).click()
    await expect(page.getByTestId(`pagos-config-regla-${GRADO_ID}-1`)).toBeVisible()
    await expect(page.getByTestId(`pagos-config-regla-${GRADO_ID}-0-dias`)).toHaveText('1 día o más')
    await expect(page.getByTestId(`pagos-config-regla-${GRADO_ID}-1-dias`)).toHaveText('2 días o más')
    await page.getByTestId(`pagos-config-regla-${GRADO_ID}-0-monto`).fill('100')
    await page.getByTestId(`pagos-config-regla-${GRADO_ID}-1-monto`).fill('200')

    // Quitar la primera fila renumera: la que queda conserva su monto y vuelve a ser «1».
    await page.getByTestId(`pagos-config-regla-${GRADO_ID}-0-quitar`).click()
    await expect(page.getByTestId(`pagos-config-regla-${GRADO_ID}-1`)).toHaveCount(0)
    await expect(page.getByTestId(`pagos-config-regla-${GRADO_ID}-0-dias`)).toHaveText('1 día o más')
    await expect(page.getByTestId(`pagos-config-regla-${GRADO_ID}-0-monto`)).toHaveValue('200')

    // Validación: monto negativo → error y Guardar deshabilitado.
    await page.getByTestId(`pagos-config-regla-${GRADO_ID}-0-monto`).fill('-50')
    await expect(page.getByTestId('pagos-config-error')).toBeVisible()
    await expect(page.getByTestId('pagos-config-save-button')).toBeDisabled()

    // Corregir el monto → se habilita Guardar.
    await page.getByTestId(`pagos-config-regla-${GRADO_ID}-0-monto`).fill('200')
    await expect(page.getByTestId('pagos-config-error')).toHaveCount(0)
    await expect(page.getByTestId('pagos-config-save-button')).toBeEnabled()

    // Guardar (primera config = creación): confirmación, sin retroactivo.
    await page.getByTestId('pagos-config-save-button').click()
    await expect(page.getByTestId('pagos-config-confirm')).toBeVisible()
    await expect(page.getByTestId('pagos-config-retroactivo')).toHaveCount(0)
    await confirmarGuardado(page)
    await expect(page.getByText(TOAST).last()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('pagos-config-modal')).toHaveCount(0)

    // Persistencia al reabrir: un solo renglón, con sus días renumerados.
    await page.getByTestId(`config-pagos-btn-${PERIODO_ID}`).click()
    await expect(page.getByTestId('pagos-config-dia-pago')).toHaveValue('12')
    await expect(page.getByTestId(`pagos-config-monto-${GRADO_ID}`)).toHaveValue('100')
    await expect(page.getByTestId(`pagos-config-regla-${GRADO_ID}-0-dias`)).toHaveText('1 día o más')
    await expect(page.getByTestId(`pagos-config-regla-${GRADO_ID}-0-monto`)).toHaveValue('200')
    await expect(page.getByTestId(`pagos-config-regla-${GRADO_ID}-1`)).toHaveCount(0)

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
