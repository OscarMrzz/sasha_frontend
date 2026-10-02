import { test, expect, loginAs } from './fixtures/auth'

// TFE2E-26 (DEC-018). data_test.sql: José 604 coordina Séptimo e Inglés de 7-1;
// Elena 605 coordina Español e Inglés de 7-1. Contraseña Admin123!.
const ADMIN = '1002026100'
const JOSE = '1002026604'
const ELENA = '1002026605'

test.describe('rol coordinador', () => {
  test('ve sus coordinaciones en Inicio y no tiene Matrícula', async ({ page }) => {
    await loginAs(page, { code: JOSE })
    const aviso = page.getByTestId('coordinas-aviso')
    await expect(aviso).toContainText('Coordinación de Séptimo', { timeout: 15_000 })
    await expect(aviso).toContainText('Inglés de 7-1')

    const nav = page.locator('.sidebar-nav')
    await expect(nav.getByRole('link', { name: 'Alumnos', exact: true })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Matrícula', exact: true })).toHaveCount(0)
    await expect(nav.getByRole('link', { name: 'Coordinaciones', exact: true })).toHaveCount(0)
  })

  test('el coordinador de Séptimo solo ve alumnos de Séptimo', async ({ page }) => {
    await loginAs(page, { code: JOSE })
    await page.goto('/consejeria/alumnos')
    await expect(page.getByTestId('consejeria-alumnos-page')).toBeVisible({ timeout: 15_000 })
    const filas = page.locator('table.data-table tbody tr')
    await expect(filas.first()).toBeVisible({ timeout: 15_000 })
    for (const texto of await filas.allInnerTexts()) expect(texto).toContain('Séptimo')
  })

  test('Mi perfil muestra «Coordinas» y la campana abre sus notificaciones', async ({ page }) => {
    await loginAs(page, { code: JOSE })
    await page.goto('/mi-perfil')
    const perfil = page.getByTestId('mi-perfil-page')
    await expect(perfil).toContainText('José Coordinador', { timeout: 15_000 })
    await expect(perfil.getByTestId('coordinas-aviso')).toContainText('Coordinación de Séptimo')

    await page.getByTestId('notifications-bell').click()
    await expect(page.getByTestId('notifications-list')).toBeVisible()
    await expect(page.getByTestId('notification-row').first()).toBeVisible()
  })

  test('cada panel del coordinador de Séptimo solo trae Séptimo', async ({ page }) => {
    test.setTimeout(120_000)
    await loginAs(page, { code: JOSE })
    for (const ruta of ['/plan-estudio', '/asistencia', '/calificaciones', '/consejeria/maestros', '/consejeria/horarios', '/disciplina']) {
      await page.goto(ruta)
      const filas = page.locator('table.data-table tbody tr')
      await expect(filas.first(), ruta).toBeVisible({ timeout: 20_000 })
      for (const texto of await filas.allInnerTexts()) expect(texto, ruta).toContain('Séptimo')
    }

    await page.goto('/sace')
    await expect(page.locator('table.data-table tbody tr').first()).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('No tienes permiso')).toHaveCount(0)

    await page.goto('/estadisticas?agrupar=grado')
    const calificaciones = page.getByTestId('analisis-calificaciones')
    await expect(calificaciones).toContainText('Séptimo', { timeout: 20_000 })
    await expect(calificaciones).not.toContainText('Octavo')
  })

  test('la coordinadora de Español solo ve clases de Español e Inglés de 7-1', async ({ page }) => {
    await loginAs(page, { code: ELENA })
    await page.goto('/tareas')
    await expect(page.getByRole('columnheader', { name: 'Maestro' })).toBeVisible({ timeout: 15_000 })
    const filas = page.locator('table.data-table tbody tr')
    await expect(filas.first()).toBeVisible({ timeout: 15_000 })
    for (const texto of await filas.allInnerTexts()) expect(texto).toMatch(/Español|Inglés/)
  })
})

test.describe('admin: coordinaciones', () => {
  test('crea una coordinación por sección con resumen en vivo', async ({ page }) => {
    const titulo = `Séptimo 1 e2e ${Date.now()}`
    await loginAs(page, { code: ADMIN })
    await page.locator('.sidebar-nav').getByTitle('Coordinaciones').click()
    await expect(page.getByTestId('coordinaciones-page')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('table.data-table tbody')).toContainText('Coordinación de Español')

    await page.getByTestId('data-table-add-button').click()
    await page.getByTestId('coord-titulo').fill(titulo)
    await page.getByTestId('coord-descripcion').fill('Solo la sección 1 de Séptimo.')
    await page.getByTestId('coord-siguiente').click()

    await page.getByTestId('coord-tab-grado').check({ force: true })
    await page.getByTestId('coord-grado-Séptimo-abrir').click()
    await page.getByTestId('coord-seccion-Séptimo-1').check()
    await expect(page.getByTestId('coord-resumen-cifra')).toHaveText(/\d+ clases en 1 sección/, { timeout: 15_000 })

    await page.getByTestId('coord-grado-Séptimo').check()
    await expect(page.getByTestId('coord-seccion-Séptimo-2')).toBeDisabled()
    await page.getByTestId('coord-grado-Séptimo').uncheck()
    await page.getByTestId('coord-seccion-Séptimo-1').check()

    await page.getByTestId('coord-tab-avanzado').check({ force: true })
    await page.getByTestId('coord-av-Séptimo').click()
    await page.getByTestId('coord-av-Séptimo-1').click()
    await expect(page.getByTestId('coord-av-Séptimo-1-Español')).toBeDisabled()

    await page.getByTestId('coord-guardar').click()
    const fila = page.locator('table.data-table tbody tr', { hasText: titulo })
    await expect(fila).toContainText('Todas las materias · Séptimo 1', { timeout: 15_000 })
  })

  test('al crear un usuario coordinador se eligen sus coordinaciones', async ({ page }) => {
    await loginAs(page, { code: ADMIN })
    await page.goto('/usuarios')
    await page.getByTestId('data-table-add-button').click()
    await page.getByTestId('user-primer-nombre-input').fill('Rita')
    await page.getByTestId('user-primer-apellido-input').fill('Coordinadora')
    await page.getByTestId('user-role-select').click()
    await page.locator('.combobox__list').getByRole('option', { name: 'Coordinador', exact: true }).click()

    await expect(page.getByTestId('create-user-button')).toBeDisabled()
    await page.getByTestId('user-coordinacion-Coordinación de Español').check()
    await expect(page.getByTestId('create-user-button')).toBeEnabled()
  })
})
