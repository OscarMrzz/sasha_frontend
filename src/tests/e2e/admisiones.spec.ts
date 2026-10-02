import { test, expect, loginAs } from './fixtures/auth'

// TFE2E-27 (DEC-019). data_test.sql: Sara Admisiones 606, únicamente matricula. Contraseña Admin123!.
const ADMISIONES = '1002026606'

test.describe('rol admisiones', () => {
  test('el menú solo tiene Inicio y Matrícula', async ({ page }) => {
    await loginAs(page, { code: ADMISIONES })
    await expect(page.locator('.sidebar-nav').getByTitle('Matrícula')).toBeVisible({ timeout: 15_000 })
    const titulos = await page.locator('.sidebar-nav [title]').evaluateAll((els) => els.map((e) => e.getAttribute('title')))
    expect(titulos.filter((t) => t !== 'Expandir' && t !== 'Colapsar').sort()).toEqual(['Inicio', 'Matrícula'])
  })

  test('abre el asistente de matrícula con los catálogos cargados', async ({ page }) => {
    await loginAs(page, { code: ADMISIONES })
    await page.locator('.sidebar-nav').getByTitle('Matrícula').click()
    await expect(page).toHaveURL(/matricula/)
    await page.getByRole('button', { name: 'Nueva matrícula' }).click()
    await expect(page.getByRole('heading', { name: 'Nueva matrícula' })).toBeVisible()

    await page.getByTestId('matricula-primer-nombre').fill('Ana')
    await page.getByTestId('matricula-primer-apellido').fill('Lopez')
    await page.getByTestId('matricula-sexo').click()
    await page.getByRole('button', { name: 'Femenino' }).click()
    await page.getByTestId('matricula-fecha-nacimiento').fill('2015-03-10')
    await page.getByTestId('matricula-telefono').fill('88721992')
    await page.getByTestId('matricula-wizard-next').click()
    await expect(page.getByText('¿De dónde proviene el alumno?')).toBeVisible({ timeout: 8_000 })
    await expect(page.getByText('No tienes permiso')).toHaveCount(0)
  })

  test('Mi perfil y la campana de notificaciones', async ({ page }) => {
    await loginAs(page, { code: ADMISIONES })
    await page.goto('/mi-perfil')
    await expect(page.getByTestId('mi-perfil-page')).toContainText('Sara Admisiones', { timeout: 15_000 })

    await page.getByTestId('notifications-bell').click()
    await expect(page.getByTestId('notifications-list')).toBeVisible()
    await expect(page.getByTestId('notification-row').first()).toBeVisible()
  })

  test('no entra a otras páginas', async ({ page }) => {
    await loginAs(page, { code: ADMISIONES })
    for (const ruta of ['/consejeria/alumnos', '/usuarios', '/tareas', '/estadisticas']) {
      await page.goto(ruta)
      await expect(page.getByText('No tienes permiso')).toBeVisible({ timeout: 15_000 })
    }
  })
})
