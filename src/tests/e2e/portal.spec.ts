import { test, expect, loginAs } from './fixtures/auth'

const ALUMNO = '1002026701'
const RESPONSABLE = '1002026901'

test.describe('portal alumno y responsable @smoke', () => {
  test('alumno: inicio con bienvenida y botones; horario, clases y modo clase', async ({ page }) => {
    await loginAs(page, { code: ALUMNO })
    await expect(page.getByTestId('alumno-home')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('sidebar-collapse')).toHaveCount(0)
    await expect(page.getByTestId('top-inicio')).toBeVisible()
    for (const id of ['tareas', 'clases', 'horario', 'notas']) {
      await expect(page.getByTestId(`alumno-tile-${id}`)).toBeVisible()
    }

    // Horario
    await page.getByTestId('alumno-tile-horario').click()
    await expect(page).toHaveURL(/\/alumno\/horario$/, { timeout: 10_000 })
    await expect(page.getByTestId('alumno-horario')).toBeVisible()
    await expect(page.getByTestId('alumno-horario-semana')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('horario-recreo')).toHaveText(/Recreo/i)
    await page.getByTestId('alumno-atras').click()
    await expect(page).toHaveURL(/\/alumno\/?$/, { timeout: 10_000 })

    // Clases → modo clase
    await page.getByTestId('alumno-tile-clases').click()
    await expect(page).toHaveURL(/\/alumno\/clases$/, { timeout: 10_000 })
    const card = page.getByTestId('alumno-clases-lista').locator('.app-tile').first()
    await expect(card).toBeVisible({ timeout: 15_000 })
    const curso = (await card.locator('.app-tile__label').textContent())?.trim() ?? ''
    await card.click()

    await expect(page).toHaveURL(/\/tareas/, { timeout: 10_000 })
    await expect(page.getByTestId('sidebar-collapse')).toBeVisible()
    await expect(page.getByTestId('sidebar-clase')).toContainText(curso)
    await expect(page.getByTestId('portal-tareas')).toContainText(`Tareas · ${curso}`, {
      timeout: 15_000,
    })
    await expect(page.locator('.sidebar-nav').getByTitle('Inicio')).toHaveCount(0)

    await page.getByRole('link', { name: 'Calificaciones' }).click()
    await expect(page.getByTestId('portal-calificaciones')).toContainText(curso, {
      timeout: 15_000,
    })

    await page.getByTestId('top-inicio').click()
    await expect(page).toHaveURL(/\/alumno\/?$/, { timeout: 10_000 })
    await expect(page.getByTestId('sidebar-collapse')).toHaveCount(0)
  })

  test('alumno: badge T y aviso de tareas para hoy/mañana sin revisar', async ({ page }) => {
    await loginAs(page, { code: ALUMNO })
    await expect(page.getByTestId('alumno-tile-clases')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('alumno-tile-clases').click()
    await expect(page.getByTestId('alumno-clases-lista')).toBeVisible({ timeout: 15_000 })

    const badges = page.locator('[data-testid^="alumno-clase-badge-"]')
    const n = await badges.count()
    for (let i = 0; i < n; i++) {
      await expect(badges.nth(i)).toHaveText(/^T[1-9]\d*$/)
    }

    // data_test.sql: Pedro (Español) tiene 2 tareas sin calificar que vencen mañana.
    const espanol = page.getByTestId('alumno-clases-lista').locator('.app-tile', { hasText: 'Español' })
    await expect(espanol.locator('[data-testid^="alumno-clase-badge-"]')).toBeVisible()
    await expect(espanol.locator('[data-testid^="alumno-clase-tareas-"]')).toContainText(/mañana/i)
  })

  test('alumno: tareas muestra todas sin importar la clase', async ({ page }) => {
    await loginAs(page, { code: ALUMNO })
    await page.getByTestId('alumno-tile-tareas').click()
    await expect(page).toHaveURL(/\/alumno\/tareas$/, { timeout: 10_000 })
    await expect(page.getByTestId('alumno-tareas')).toBeVisible()
    await expect(page.getByTestId('alumno-tareas-pendientes')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('alumno-tareas-revisadas')).toBeVisible()
    // El curso de cada tarea viene del backend (sin importar la clase elegida).
    await expect(page.getByTestId('alumno-tareas-pendientes').locator('.app-list__sub').first()).toContainText(
      /·/,
    )
  })

  test('alumno: plan de estudio muestra pensum y plan activo, sin tabla ni filtros', async ({ page }) => {
    await loginAs(page, { code: ALUMNO })
    await page.getByTestId('alumno-tile-clases').click()
    await page.getByTestId('alumno-clases-lista').locator('.app-tile', { hasText: 'Español' }).click()
    await expect(page.getByTestId('portal-tareas')).toBeVisible({ timeout: 15_000 })
    await page.getByRole('link', { name: 'Plan de estudio' }).click()

    const plan = page.getByTestId('portal-plan')
    await expect(plan).toContainText('Plan de estudio · Español', { timeout: 15_000 })
    await expect(page.getByTestId('portal-plan-silabo')).toContainText('Prerrequisitos')
    await expect(page.getByTestId('portal-plan-items').locator('.neon-card-row').first()).toBeVisible()
    await expect(page.locator('table.data-table')).toHaveCount(0)
    await expect(page.getByRole('searchbox')).toHaveCount(0)
    await expect(page.getByRole('combobox')).toHaveCount(0)

    const download = page.waitForEvent('download')
    await page.getByTestId('portal-plan-pdf').click()
    expect((await download).suggestedFilename()).toMatch(/\.pdf$/)
  })

  test('alumno: Notas abre el bento sin sidebar', async ({ page }) => {
    await loginAs(page, { code: ALUMNO })
    await page.getByTestId('alumno-tile-notas').click()
    await expect(page).toHaveURL(/\/alumno\/resultados$/, { timeout: 10_000 })
    await expect(page.getByTestId('sidebar-collapse')).toHaveCount(0)
    for (const id of ['promedio', 'cuadro', 'tendencia', 'parciales']) {
      await expect(page.getByTestId(`resultado-${id}`)).toBeVisible({ timeout: 15_000 })
    }
    await expect(page.getByTestId('resultado-promedio-parcial')).toBeVisible()
    // Del más reciente al primero: III (bloqueado por julio y agosto), II y I. El IV no se libera y no aparece.
    const bloques = page.getByTestId('resultado-parciales').locator('.parcial-bloque')
    await expect(bloques).toHaveCount(3)
    await expect(bloques.nth(0)).toHaveAttribute('data-testid', 'resultado-parcial-3')
    await expect(bloques.nth(0)).toHaveAttribute('data-estado', 'bloqueado_pago')
    await expect(bloques.nth(0)).toContainText(/julio/i)
    const ii = page.getByTestId('resultado-parcial-2')
    await expect(ii).toContainText('Matemáticas')
    await expect(bloques.nth(2)).toHaveAttribute('data-testid', 'resultado-parcial-1')
    // De I a II: Matemáticas 62 → 75 sube, Inglés 68 → 64 baja; el promedio mejora.
    await expect(page.getByTestId('resultado-tendencia')).toHaveAttribute('data-estado', 'mejoro')
    await expect(ii.locator('.nota-flecha--sube').first()).toBeVisible()
    await expect(ii.locator('.nota-flecha--baja').first()).toBeVisible()
    // Análisis del II: tareas en casa bajas pero mejores que en I; felicitación por asistencia.
    const mejorar = page.getByTestId('resultado-parcial-2-mejorar')
    await expect(mejorar.locator('[data-categoria="casa"]')).toContainText('sin embargo')
    await expect(page.getByTestId('resultado-parcial-2-destaca').locator('[data-categoria="asistencia"]')).toContainText(
      'Felicitamos',
    )
    await expect(page.getByTestId('resultado-parcial-3-mejorar')).toHaveCount(0)
    await expect(page.getByTestId('resultado-periodo')).toHaveAttribute('data-estado', 'bloqueado')

    await page.getByTestId('alumno-resultados-volver').click()
    await expect(page).toHaveURL(/\/alumno\/?$/, { timeout: 10_000 })
  })

  test('alumno: sin clase elegida, tareas vuelve al inicio', async ({ page }) => {
    await loginAs(page, { code: ALUMNO })
    await page.goto('/tareas')
    await expect(page).toHaveURL(/\/alumno\/?$/, { timeout: 10_000 })
  })

  test('responsable ve la card del hijo y al elegirla entra a su inicio con botones', async ({ page }) => {
    await loginAs(page, { code: RESPONSABLE })
    await expect(page.getByTestId('responsable-home')).toBeVisible({ timeout: 15_000 })
    const hijo = page.getByTestId('responsable-hijos').locator('.hijo-card').first()
    await expect(hijo).toBeVisible({ timeout: 15_000 })
    await expect(hijo).toContainText('N.º de cuenta')
    await hijo.click()

    await expect(page).toHaveURL(/\/alumno\/?$/, { timeout: 10_000 })
    await expect(page.getByTestId('alumno-home')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('alumno-home-title')).toHaveText('Ana Alvarez')
    await expect(page.getByTestId('sidebar-collapse')).toHaveCount(0)
    for (const id of ['tareas', 'horario', 'plan', 'pagos', 'calificaciones']) {
      await expect(page.getByTestId(`padre-tile-${id}`)).toBeVisible()
    }
    await expect(page.getByTestId('alumno-tiles')).toHaveCount(0)

    await page.getByTestId('alumno-cambiar').click()
    await expect(page).toHaveURL(/\/responsable\/?$/, { timeout: 10_000 })
    await page.getByTestId('responsable-hijos').locator('.hijo-card').first().click()
    await page.getByTestId('padre-tile-tareas').click()
    await expect(page.getByTestId('padre-tareas')).toBeVisible({ timeout: 15_000 })

    await page.getByTestId('top-inicio').click()
    await expect(page).toHaveURL(/\/responsable\/?$/, { timeout: 10_000 })
    await expect(page.getByTestId('responsable-hijos')).toBeVisible({ timeout: 10_000 })
  })
})
