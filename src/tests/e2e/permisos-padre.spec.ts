import { test, expect, loginAs, cerrarSesion, entrarComoPadre } from './fixtures/auth'

const PADRE = '1002026901'
const CONSEJERIA = '1002026602'
const MAESTRO = '1002026501'

async function abrirPermisosPadre(page: Parameters<typeof loginAs>[0]) {
  await entrarComoPadre(page, PADRE)
  await page.getByTestId('padre-tile-permisos').click()
  await expect(page.getByTestId('padre-permisos')).toBeVisible({ timeout: 15_000 })
}

async function crearSolicitud(page: Parameters<typeof loginAs>[0], detalle: string, fecha: string) {
  await page.getByTestId('permiso-solicitar').click()
  await expect(page.getByTestId('permiso-wizard')).toBeVisible()
  await page.getByTestId('permiso-wizard-inicio').fill(fecha)
  await page.getByTestId('permiso-wizard-fin').fill(fecha)
  await page.getByTestId('permiso-wizard-siguiente').click()
  await page.getByTestId('permiso-wizard-tipo-enfermedad_alumno').click()
  await page.getByTestId('permiso-wizard-siguiente').click()
  await page.getByTestId('permiso-wizard-detalle').fill(detalle)
  await page.getByTestId('permiso-wizard-siguiente').click()
  await page.getByTestId('permiso-wizard-enviar').click()
  await expect(page.getByTestId('permiso-wizard')).toHaveCount(0, { timeout: 15_000 })
  await expect(page.locator('.permiso-fila', { hasText: detalle })).toBeVisible({ timeout: 15_000 })
}

async function abrirBandeja(page: Parameters<typeof loginAs>[0]) {
  await loginAs(page, { code: CONSEJERIA })
  await page
    .locator('.sidebar-nav')
    .getByTitle('Solicitud de permisos', { exact: true })
    .first()
    .click()
  await expect(page.getByTestId('solicitud-permisos-page')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('table.data-table tbody tr').first()).toBeVisible({ timeout: 15_000 })
}

test.describe('permisos del padre', () => {
  test('el padre envía y consejería aprueba', async ({ page }) => {
    const detalle = `Permiso E2E aprobar ${Date.now()}`
    await abrirPermisosPadre(page)
    await crearSolicitud(page, detalle, '2026-12-13')

    await cerrarSesion(page)
    await abrirBandeja(page)
    const fila = page.locator('table.data-table tbody tr', { hasText: 'Ana Alvarez' }).first()
    await expect(fila).toContainText('Pendiente')
    await fila.click({ button: 'right' })
    await page.getByTestId('permisos-ctx-validar').click()
    await expect(page.getByTestId('permiso-detalle')).toBeVisible()
    await page.getByTestId('permiso-aprobar').click()
    await page.getByTestId('permiso-aprobar-confirmar').getByRole('button', { name: 'Aprobar' }).click()
    await expect(page.locator('table.data-table tbody tr', { hasText: 'Ana Alvarez' }).first()).toContainText(
      'Aprobado',
      { timeout: 15_000 },
    )

    await cerrarSesion(page)
    await abrirPermisosPadre(page)
    await expect(page.locator('.permiso-fila', { hasText: detalle })).toContainText('Aprobado')
  })

  test('consejería rechaza con motivo y el padre lo ve', async ({ page }) => {
    const detalle = `Permiso E2E rechazar ${Date.now()}`
    await abrirPermisosPadre(page)
    await crearSolicitud(page, detalle, '2026-12-14')

    await cerrarSesion(page)
    await abrirBandeja(page)
    const fila = page.locator('table.data-table tbody tr', { hasText: 'Ana Alvarez' }).first()
    await fila.click({ button: 'right' })
    await page.getByTestId('permisos-ctx-validar').click()
    await page.getByTestId('permiso-rechazar').click()
    await page.getByTestId('permiso-motivo').fill('Falta un documento')
    await page.getByTestId('permiso-rechazo-confirmar').click()
    await expect(page.locator('table.data-table tbody tr', { hasText: 'Ana Alvarez' }).first()).toContainText(
      'Rechazado',
      { timeout: 15_000 },
    )

    await cerrarSesion(page)
    await abrirPermisosPadre(page)
    const solicitud = page.locator('.permiso-fila', { hasText: detalle })
    await expect(solicitud).toContainText('Rechazado')
    await expect(solicitud).toContainText('Falta un documento')
  })

  test('un rol sin permiso no ve los menús de permisos', async ({ page }) => {
    await loginAs(page, { code: MAESTRO })
    await expect(
      page.locator('.sidebar-nav').getByTitle('Solicitud de permisos', { exact: true }),
    ).toHaveCount(0)
    await expect(
      page.locator('.sidebar-nav').getByTitle('Tipos de permisos', { exact: true }),
    ).toHaveCount(0)
  })
})
