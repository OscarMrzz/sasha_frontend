import { test, expect, loginAs } from './fixtures/auth'

// PAN-CON-01 a 03: Inicio, menú, Mi perfil y campana del rol consejería (sin catalogos:get).
const CONSEJERIA = '1002026602'

test.describe('consejería: inicio, menú, perfil y campana', () => {
  test('inicio carga sin errores de permisos y el menú solo trae sus módulos', async ({ page }) => {
    await loginAs(page, { code: CONSEJERIA })
    await page.goto('/dashboard')
    await expect(page.getByTestId('notifications-bell')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('No tienes permiso')).toHaveCount(0)

    const nav = page.locator('nav')
    for (const visible of ['Plan de estudio', 'Asistencia', 'Tareas', 'Calificaciones', 'Estadísticas', 'Export SACE']) {
      await expect(nav.getByRole('link', { name: visible })).toBeVisible()
    }
    for (const oculto of ['Configuración', 'Usuarios', 'Matrícula', 'Pagos', 'Auditoría']) {
      await expect(nav.getByRole('link', { name: oculto })).toHaveCount(0)
    }
  })

  test('mi perfil muestra sus datos', async ({ page }) => {
    await loginAs(page, { code: CONSEJERIA })
    await page.goto('/mi-perfil')
    await expect(page.getByTestId('mi-perfil-page')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('perfil-nombre')).toContainText('Carlos')
    await expect(page.getByTestId('perfil-expediente')).toBeVisible()
  })

  test('la campana abre la lista de notificaciones', async ({ page }) => {
    await loginAs(page, { code: CONSEJERIA })
    await page.goto('/dashboard')
    await page.getByTestId('notifications-bell').click()
    const modal = page.getByRole('dialog', { name: /Notificaciones/ })
    await expect(modal).toBeVisible()
    await modal.getByRole('button', { name: 'Cerrar' }).click()
    await expect(modal).toBeHidden()
  })
})
