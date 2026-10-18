import { test, expect, loginAs } from './fixtures/auth'

// Feature 018: en teléfono/tablet las tablas del maestro se ven como cards y las
// acciones quedan en el botón de 3 puntos (el clic derecho no existe en táctil).
// El escritorio no cambia: ver `tareas.spec.ts`, `calificaciones.spec.ts`, etc.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

// Maestro de Español 7-1 del fixture; alumno 701 para el horario del portal.
const MAESTRO = '1002026501'
const ALUMNO = '1002026701'

test.describe('cards en móvil — maestro', () => {
  test('tareas: la tabla es una lista de cards y el 3 puntos trae las acciones', async ({ page }) => {
    await loginAs(page, { code: MAESTRO })
    await page.goto('/tareas')

    const cards = page.getByTestId('data-cards')
    await expect(cards).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('table.data-table')).toHaveCount(0)

    const card = page.locator('[data-testid^="tarea-card-"]').first()
    await expect(card).toBeVisible({ timeout: 15_000 })
    await expect(card).toContainText('Puntos')
    await expect(card).toContainText('Entrega')

    // El 3 puntos reemplaza al clic derecho en el teléfono.
    await card.getByRole('button', { name: 'Acciones' }).click()
    const menu = page.getByRole('menu')
    await expect(menu).toBeVisible()
    await expect(menu.getByTestId('tareas-staff-ctx-ver')).toBeVisible()
    await expect(menu.getByTestId('tareas-staff-ctx-editar')).toBeVisible()

    // Una acción del menú funciona: Revisar abre el modal de revisión.
    await menu.getByTestId('tareas-staff-ctx-revisar').click()
    await expect(page.getByTestId('tarea-revision-modal')).toBeVisible({ timeout: 15_000 })
  })

  test('calificaciones: card por alumno con cada parcial y su puntaje', async ({ page }) => {
    await loginAs(page, { code: MAESTRO })
    await page.goto('/calificaciones')

    await expect(page.getByTestId('data-cards')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('table.data-table')).toHaveCount(0)

    const card = page.locator('[data-testid^="calificacion-card-"]').first()
    await expect(card).toBeVisible({ timeout: 15_000 })
    await expect(card.locator('.data-card__title')).not.toBeEmpty()
    await expect(card).toContainText('Total')
    await expect(card).toContainText('Promedio')
  })

  test('recuperaciones: cards con el menú Ver / Editar / Eliminar', async ({ page }) => {
    await loginAs(page, { code: MAESTRO })
    await page.goto('/recuperaciones')

    await expect(page.getByTestId('data-cards')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('table.data-table')).toHaveCount(0)

    const card = page.locator('[data-testid^="recuperacion-card-"]').first()
    await expect(card).toBeVisible({ timeout: 15_000 })
    await card.getByRole('button', { name: 'Acciones' }).click()
    await expect(page.getByTestId('recuperaciones-ctx-ver')).toBeVisible()
  })

  test('plan de estudio: cards con el menú de acciones', async ({ page }) => {
    await loginAs(page, { code: MAESTRO })
    await page.goto('/plan-estudio')

    await expect(page.getByTestId('data-cards')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('table.data-table')).toHaveCount(0)

    const card = page.locator('[data-testid^="plan-card-"]').first()
    await expect(card).toBeVisible({ timeout: 15_000 })
    await expect(card).toContainText('Aprobación')
    await card.getByRole('button', { name: 'Acciones' }).click()
    await expect(page.getByTestId('plan-auditoria')).toBeVisible()
  })
})

test.describe('horarios en móvil — vista por días', () => {
  test('maestro: pestañas de días + lista (sin la tabla semanal)', async ({ page }) => {
    await loginAs(page, { code: MAESTRO })
    await page.goto('/maestro')

    const seccion = page.getByTestId('maestro-hub-horario')
    await expect(seccion).toBeVisible({ timeout: 15_000 })
    await expect(seccion.getByTestId('horario-maestro-lista')).toBeVisible({ timeout: 15_000 })
    await expect(seccion.getByTestId('horario-maestro-dia-1')).toBeVisible()
    await expect(page.getByTestId('horario-maestro-grid')).toHaveCount(0)

    // El bloque lleva su propio 3 puntos con «Ver».
    const bloque = seccion.locator('[data-testid^="horario-maestro-menu-"]').first()
    await expect(bloque).toBeVisible()
    await bloque.click()
    await expect(page.getByTestId('horario-maestro-ctx-ver')).toBeVisible()
  })

  test('alumno: pestañas de días + lista (sin la tabla semanal)', async ({ page }) => {
    await loginAs(page, { code: ALUMNO })
    await page.getByTestId('alumno-tile-horario').click()
    await expect(page).toHaveURL(/\/alumno\/horario$/, { timeout: 10_000 })

    await expect(page.getByTestId('alumno-horario')).toBeVisible()
    await expect(page.getByTestId('alumno-horario-lista')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('alumno-horario-dia-1')).toBeVisible()
    await expect(page.getByTestId('alumno-horario-semana')).toHaveCount(0)
  })
})

test.describe('asistencia en móvil — sin cards', () => {
  test('el maestro ve la lista de alumnos y la columna para pasar lista', async ({ page }) => {
    await loginAs(page, { code: MAESTRO })
    await page.goto('/asistencia')

    await expect(page.getByTestId('asistencia-inline')).toBeVisible({ timeout: 15_000 })
    // La grilla sigue siendo tabla (no se convierte en cards).
    await expect(page.getByTestId('asistencia-semana-table')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('data-cards')).toHaveCount(0)

    const celdas = page.locator('[data-testid^="asistencia-celda-"]')
    await expect(celdas.first()).toBeVisible()
    await expect(page.getByTestId('asistencia-guardar')).toBeVisible()
  })
})
