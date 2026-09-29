import { test, expect, loginAs } from './fixtures/auth'
import type { Page } from '@playwright/test'

// data_test.sql: P1 liberado, P2 liberado hoy, P3 terminado sin liberar.
// 701 (padre 901) debe mayo (P2) y julio/agosto (P3); 704 debe marzo (P1).
const ALUMNO_701 = '1002026701'
const PADRE_701 = '1002026901'
const ALUMNO_DEBE_MARZO = '1002026704'

async function abrirCalificacionesEspanol(page: Page, code: string) {
  await loginAs(page, { code })
  await page.getByTestId('alumno-clases').locator('.clase-card', { hasText: 'Español' }).click()
  await expect(page.getByTestId('portal-tareas')).toBeVisible({ timeout: 15_000 })
  await page.getByRole('link', { name: 'Calificaciones' }).click()
  await expect(page.getByTestId('portal-calificaciones')).toContainText('Español', { timeout: 15_000 })
}

test.describe('liberación de notas por parcial', () => {
  test('alumno: bento con promedio y un tile por parcial, sin cuadro', async ({ page }) => {
    await abrirCalificacionesEspanol(page, ALUMNO_701)
    await expect(page.getByTestId('portal-calif-promedio')).toBeVisible()
    await expect(page.getByTestId('portal-calif-promedio-parcial')).toBeVisible()
    await expect(page.getByTestId('portal-calif-cuadro')).toHaveCount(0)
    await expect(page.getByTestId('portal-calif-parcial-1')).toHaveAttribute('data-estado', 'visible')
    await expect(page.getByTestId('portal-calif-parcial-2')).toHaveAttribute('data-estado', 'bloqueado_pago')
    await expect(page.getByTestId('portal-calif-parcial-2')).toContainText(/mayo/i)
    await expect(page.getByTestId('portal-calif-parcial-3')).toHaveAttribute('data-estado', 'no_liberado')
    await expect(page.getByTestId('portal-calif-parcial-3')).toContainText('Aún no liberado')
    await expect(page.locator('table.data-table')).toHaveCount(0)
  })

  test('padre 901: aviso general y personal de hoy, y II parcial bloqueado por mayo', async ({ page }) => {
    await loginAs(page, { code: PADRE_701 })
    await page.getByTestId('notifications-bell').click()
    const list = page.getByTestId('notifications-list')
    await expect(list).toContainText('Calificaciones disponibles', { timeout: 10_000 })
    await page
      .getByTestId('notification-row')
      .filter({ has: page.locator('.notif-row__title', { hasText: /^Calificaciones del II parcial$/ }) })
      .click()
    await expect(page.getByTestId('notification-detail')).toContainText(/Ana Alvarez.*mayo 2026/)
    await page.keyboard.press('Escape')
    await page.keyboard.press('Escape')

    await page.getByTestId('alumno-clases').locator('.clase-card', { hasText: 'Español' }).click()
    await expect(page.getByTestId('portal-tareas')).toBeVisible({ timeout: 15_000 })
    await page.getByRole('link', { name: 'Calificaciones' }).click()
    await expect(page.getByTestId('portal-calif-parcial-2')).toHaveAttribute('data-estado', 'bloqueado_pago', {
      timeout: 15_000,
    })
  })

  test('otro padre no recibe el aviso personal de 701', async ({ page }) => {
    await loginAs(page, { code: '1002026902' })
    await page.getByTestId('notifications-bell').click()
    const list = page.getByTestId('notifications-list')
    await expect(list).toContainText('Calificaciones disponibles', { timeout: 10_000 })
    await expect(list.locator('.notif-row__title', { hasText: /^Calificaciones del II parcial$/ })).toHaveCount(0)
  })

  test('alumno que debe marzo ve P1 bloqueado con mensaje amable', async ({ page }) => {
    await abrirCalificacionesEspanol(page, ALUMNO_DEBE_MARZO)
    const p1 = page.getByTestId('portal-calif-parcial-1')
    await expect(p1).toHaveAttribute('data-estado', 'bloqueado_pago')
    await expect(p1).toContainText(/marzo/i)
    await expect(page.getByTestId('portal-calif-parcial-2')).toHaveAttribute('data-estado', 'visible')
  })

  test('admin: panel con parciales, modal explicativo y tabla de bloqueados', async ({ page }) => {
    await loginAs(page)
    await page.goto('/liberacion-notas')
    await expect(page.getByTestId('liberacion-parcial-1')).toHaveAttribute('data-estado', 'liberado', {
      timeout: 15_000,
    })
    await expect(page.getByTestId('liberacion-parcial-3')).toHaveAttribute('data-estado', 'terminado')

    await page.getByTestId('liberacion-liberar-btn').click()
    const modal = page.getByTestId('liberacion-modal')
    await expect(modal).toContainText('Parcial 3')
    await expect(modal).toContainText(/mensualidades de los meses/i)
    await expect(modal).toContainText(/aviso personal/i)
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect(modal).toHaveCount(0)

    const fila = page.locator('table.data-table tbody tr', { hasText: ALUMNO_DEBE_MARZO })
    await expect(fila).toBeVisible({ timeout: 15_000 })
    await fila.click({ button: 'right' })
    await page.getByTestId('liberacion-ctx-ver').click()
    await expect(page.getByTestId('liberacion-detalle-pagos')).toContainText(/marzo 2026/i)
    await page.getByRole('button', { name: 'Cerrar' }).click()

    await fila.click({ button: 'right' })
    await page.getByTestId('liberacion-ctx-forzar').click()
    const confirmar = page.getByTestId('liberacion-forzar-confirmar')
    await expect(confirmar).toBeDisabled()
    await page.getByTestId('liberacion-forzar-input').fill('1002026799')
    await expect(confirmar).toBeDisabled()
    await page.getByTestId('liberacion-forzar-input').fill(ALUMNO_DEBE_MARZO)
    await expect(confirmar).toBeEnabled()
    await page.getByRole('button', { name: 'Cancelar' }).click()
  })

  test('caja: cobro por meses con checkboxes', async ({ page }) => {
    await loginAs(page)
    await page.goto('/pagos')
    await page.getByTestId('pago-meses-code-input').fill(ALUMNO_701)
    await page.getByTestId('pago-meses-buscar').click()
    const julio = page.getByTestId('pago-mes-2026-7')
    await expect(julio).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('pago-mes-2026-6').locator('input')).toBeDisabled()
    await expect(page.getByTestId('pago-meses-cobrar')).toBeDisabled()
    await julio.locator('input').check()
    await page.getByTestId('pago-mes-2026-8').locator('input').check()
    await expect(page.getByTestId('pago-meses-cobrar')).toContainText('2 mes(es) · L 3000.00')
  })

  test('periodos: modal de parciales muestra los meses que abarca', async ({ page }) => {
    await loginAs(page)
    await page.goto('/catalogos/periodos')
    const fila = page.locator('table.data-table tbody tr').first()
    await expect(fila).toBeVisible({ timeout: 15_000 })
    await fila.click({ button: 'right' })
    await page.getByTestId('periodo-ctx-parciales').click()
    await expect(page.getByTestId('parciales-tabla')).toBeVisible()

    await page.getByTestId('parcial-nuevo').click()
    await page.getByTestId('parcial-inicio-input').fill('2026-03-20')
    await page.getByTestId('parcial-fin-input').fill('2026-05-05')
    await expect(page.getByTestId('parcial-meses-preview')).toContainText(/marzo 2026, abril 2026, mayo 2026/i)
  })
})
