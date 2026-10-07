import { test, expect, loginAs } from './fixtures/auth'

// data_test.sql: alumna Ana (701) en 7-1 con su padre 901 como responsable principal.
// Maestro Pedro (501) con asignaciones activas.
const ALUMNA_ANA = '1002026701'
const PADRE_ANA = '1002026901'
const MAESTRO_PEDRO = '1002026501'

// PNG de 1×1 px.
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

test.describe('mi perfil', () => {
  test('padre: sin sidebar, sus datos, hogar y alumnos a cargo', async ({ page }) => {
    await loginAs(page, { code: PADRE_ANA })
    await page.goto('/mi-perfil')
    await expect(page.getByTestId('mi-perfil-page')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('sidebar-collapse')).toHaveCount(0)

    await expect(page.getByTestId('perfil-datos-personales')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('perfil-hogar')).toBeVisible()
    await expect(page.getByTestId('perfil-a-cargo')).toContainText('Ana')
    await expect(page.getByTestId('perfil-matricula')).toHaveCount(0)
    await expect(page.getByTestId('perfil-carga')).toHaveCount(0)
  })

  test('alumna: matrícula en 7 y su responsable principal', async ({ page }) => {
    await loginAs(page, { code: ALUMNA_ANA })
    await page.goto('/mi-perfil')
    await expect(page.getByTestId('perfil-matricula')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('perfil-nombre')).toContainText('Ana')
    await expect(page.getByTestId('perfil-responsables')).toContainText('Principal')
    await expect(page.getByTestId('perfil-a-cargo')).toHaveCount(0)
  })

  test('alumna: la foto de perfil sigue al cerrar y volver a entrar', async ({ page }) => {
    await loginAs(page, { code: ALUMNA_ANA })
    await page.goto('/mi-perfil')
    await expect(page.getByTestId('mi-perfil-page')).toBeVisible({ timeout: 15_000 })

    await page.getByTestId('perfil-foto-input').setInputFiles({
      name: 'foto.png',
      mimeType: 'image/png',
      buffer: PNG_1PX,
    })
    await expect(page.getByText('Foto de perfil actualizada')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('perfil-foto-btn').locator('img')).toBeVisible()

    await page.getByTestId('user-panel').click()
    await page.getByTestId('logout-button').click()
    await page.getByRole('button', { name: 'Salir' }).click()
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })

    await loginAs(page, { code: ALUMNA_ANA })
    await expect(page.getByTestId('user-panel').locator('img')).toBeVisible({ timeout: 15_000 })
    await page.goto('/mi-perfil')
    await expect(page.getByTestId('perfil-foto-btn').locator('img')).toBeVisible({ timeout: 15_000 })
  })

  test('maestro: carga académica con materias y grupos', async ({ page }) => {
    await loginAs(page, { code: MAESTRO_PEDRO })
    await page.goto('/mi-perfil')
    const carga = page.getByTestId('perfil-carga')
    await expect(carga).toBeVisible({ timeout: 15_000 })
    await expect(carga.locator('.perfil-materia').first()).toBeVisible()
    await expect(carga).toContainText(/horas por semana/)
  })

  test('cambiar contraseña se abre en un modal y valida', async ({ page }) => {
    await loginAs(page, { code: PADRE_ANA })
    await page.goto('/mi-perfil')
    await expect(page.getByTestId('perfil-pwd-current')).toHaveCount(0)
    await page.getByTestId('perfil-pwd-abrir').click()

    const modal = page.getByRole('dialog', { name: 'Cambiar contraseña' })
    await expect(modal).toBeVisible()
    await page.getByTestId('perfil-pwd-current').fill('Admin123!')
    await page.getByTestId('perfil-pwd-new').fill('corta')
    await page.getByTestId('perfil-pwd-confirm').fill('otra')
    await page.getByTestId('perfil-pwd-save').click()
    await expect(modal).toContainText('Mínimo 8 caracteres')
    await expect(modal).toContainText('No coincide')

    await modal.getByRole('button', { name: 'Cancelar' }).click()
    await expect(modal).toHaveCount(0)
  })
})
