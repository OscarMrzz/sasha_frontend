import { test, expect, entrarComoPadre } from './fixtures/auth'

// Cámara falsa de Chromium: el permiso se concede solo y el video es un patrón de prueba.
test.use({
  permissions: ['camera'],
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] },
})

const PADRE_ANA = '1002026901'

test('tomar foto abre la cámara en el escritorio y captura el recibo', async ({ page }) => {
  await entrarComoPadre(page, PADRE_ANA)
  await page.getByTestId('padre-tile-pagos').click()
  await page.getByTestId('padre-subir-recibo').click()

  await page.getByTestId('recibo-tomar-foto').click()
  const camara = page.getByTestId('recibo-camara')
  await expect(camara).toBeVisible({ timeout: 10_000 })
  await expect
    .poll(() => camara.locator('video').evaluate((v: HTMLVideoElement) => v.videoWidth), { timeout: 10_000 })
    .toBeGreaterThan(0)

  await page.getByTestId('recibo-capturar').click()
  await expect(camara).toHaveCount(0)
  await expect(page.getByTestId('recibo-preview')).toContainText(/recibo-\d+\.jpg/)
  await expect(page.getByTestId('recibo-preview').locator('img')).toBeVisible()
})
