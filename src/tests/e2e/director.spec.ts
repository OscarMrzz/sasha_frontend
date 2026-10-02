import { test, expect, loginAs } from './fixtures/auth'

// DEC-017: hoy el director ve y hace lo mismo que consejería (roles independientes que coinciden).
// Ana 701 está en 7-1 con su padre 901.
const DIRECTOR = '1002026601'
const ANA = '1002026701'

test.describe('director: lo mismo que consejería', () => {
  test('el menú trae los mismos módulos que consejería', async ({ page }) => {
    await loginAs(page, { code: DIRECTOR })
    await page.goto('/dashboard')
    await expect(page.getByTestId('notifications-bell')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('No tienes permiso')).toHaveCount(0)

    const nav = page.locator('nav')
    for (const visible of [
      'Plan de estudio',
      'Asistencia',
      'Tareas',
      'Calificaciones',
      'Estadísticas',
      'Export SACE',
      'Matrícula',
      'Alumnos',
      'Maestros',
      'Horarios',
      'Fichas disciplinarias',
    ]) {
      await expect(nav.getByRole('link', { name: visible, exact: true })).toBeVisible()
    }
    for (const oculto of [
      'Configuración',
      'Usuarios',
      'Pagos',
      'Auditoría',
      'Grados',
      'Modalidades',
      'Secciones',
      'Cursos',
      'Periodos',
      'Padres',
      'Tipos de ficha',
      'Analítica de pagos',
      'Notificaciones',
    ]) {
      await expect(nav.getByRole('link', { name: oculto, exact: true })).toHaveCount(0)
    }
  })

  test('abre el expediente de un alumno con sus fichas', async ({ page }) => {
    await loginAs(page, { code: DIRECTOR })
    await page.locator('.sidebar-nav').getByTitle('Alumnos').click()
    await expect(page.getByTestId('consejeria-alumnos-page')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('data-table-search').fill(ANA)
    const ana = page.locator('table.data-table tbody tr', { hasText: ANA })
    await ana.click({ button: 'right' })
    await page.getByTestId('consejeria-alumnos-ctx-ver').click()
    await expect(page.getByTestId('expediente-responsables')).toContainText('1002026901', { timeout: 15_000 })
    await expect(page.getByTestId('expediente-fichas-tabla')).toContainText('Uso de celular en clase')
  })

  test('fichas: puede aplicar pero no define tipos', async ({ page }) => {
    await loginAs(page, { code: DIRECTOR })
    await page.locator('.sidebar-nav').getByTitle('Fichas disciplinarias').click()
    await expect(page.getByTestId('disciplina-page')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('data-table-add-button')).toBeVisible()
    await page.goto('/disciplina/tipos')
    await expect(page.getByText('No tienes permiso')).toBeVisible({ timeout: 15_000 })
  })

  test('calificaciones y tareas usan la vista general', async ({ page }) => {
    await loginAs(page, { code: DIRECTOR })
    await page.goto('/tareas')
    await expect(page.getByText('No tienes permiso')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Nueva tarea' })).toHaveCount(0)
    await page.goto('/calificaciones')
    await expect(page.getByText('No tienes permiso')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Avanzado' })).toBeVisible({ timeout: 15_000 })
  })

  test('matrícula: abre el asistente sin errores de permisos', async ({ page }) => {
    await loginAs(page, { code: DIRECTOR })
    await page.locator('.sidebar-nav').getByTitle('Matrícula').click()
    await page.getByRole('button', { name: 'Nueva matrícula' }).click()
    await expect(page.getByRole('heading', { name: 'Nueva matrícula' })).toBeVisible()
    await expect(page.getByText('No tienes permiso')).toHaveCount(0)
  })
})
