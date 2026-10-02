import { test, expect, loginAs } from './fixtures/auth'

// PAN-CON-10 a 13. data_test.sql: consejería 602. Ana 701 está en 7-1 con 11 materias, Matemáticas
// 62/75/80 y su padre es 901. Pedro 501 da Español 7-1. Solo 7-1 tiene horario activo (35 bloques).
const CONSEJERIA = '1002026602'
const ANA = '1002026701'
const PEDRO = '1002026501'

test.describe('consejería: alumnos, maestros, horarios y matrícula', () => {
  test('alumnos: Ver abre el expediente con notas, asistencia, horario y responsables', async ({ page }) => {
    await loginAs(page, { code: CONSEJERIA })
    await page.locator('.sidebar-nav').getByTitle('Alumnos').click()
    await expect(page.getByTestId('consejeria-alumnos-page')).toBeVisible({ timeout: 15_000 })

    await page.getByTestId('data-table-search').fill(ANA)
    const ana = page.locator('table.data-table tbody tr', { hasText: ANA })
    await expect(ana).toContainText('Matriculado', { timeout: 15_000 })
    await ana.click({ button: 'right' })
    await page.getByTestId('consejeria-alumnos-ctx-ver').click()

    const exp = page.getByTestId('expediente-alumno')
    await expect(exp).toBeVisible({ timeout: 15_000 })
    await expect(exp).toContainText('Datos personales')
    await expect(page.getByTestId('expediente-responsables')).toContainText('1002026901')
    await expect(page.getByTestId('expediente-materias').locator('tbody tr')).toHaveCount(11, { timeout: 15_000 })
    await expect(page.getByTestId('expediente-horario-semana')).toBeVisible()
    const mate = page.getByTestId('expediente-notas').locator('tbody tr', { hasText: 'Matemáticas' })
    await expect(mate).toContainText('62.0')
    await expect(page.getByTestId('expediente-asistencia').locator('tbody tr')).toHaveCount(11)
    await expect(page.getByTestId('expediente-matriculas')).toContainText('Séptimo')
  })

  test('maestros: Ver muestra la ficha con sus cursos', async ({ page }) => {
    await loginAs(page, { code: CONSEJERIA })
    await page.locator('.sidebar-nav').getByTitle('Maestros').click()
    await expect(page.getByTestId('consejeria-maestros-page')).toBeVisible({ timeout: 15_000 })

    await page.getByTestId('data-table-search').fill(PEDRO)
    const pedro = page.locator('table.data-table tbody tr', { hasText: PEDRO })
    await expect(pedro).toContainText('Español', { timeout: 15_000 })
    await pedro.click({ button: 'right' })
    await page.getByTestId('consejeria-maestros-ctx-ver').click()
    const cursos = page.getByTestId('ficha-maestro-cursos')
    await expect(cursos).toContainText('Español', { timeout: 15_000 })
    await expect(cursos.locator('thead th')).toHaveText(['Curso', 'Grado', 'Sección', 'Horas'])
    await expect(page.getByTestId('ficha-maestro-horas')).toHaveText('2 h 40 min por semana')
  })

  test('horarios: tabla de bloques del horario activo con búsqueda', async ({ page }) => {
    await loginAs(page, { code: CONSEJERIA })
    await page.locator('.sidebar-nav').getByTitle('Horarios').click()
    await expect(page.getByTestId('consejeria-horarios-page')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('35 filas')).toBeVisible({ timeout: 15_000 })

    await page.getByTestId('data-table-search').fill('Orientación')
    const filas = page.locator('table.data-table tbody tr')
    await expect(filas).toHaveCount(2)
    await expect(filas.first()).toContainText('Séptimo sec')
  })

  test('matrícula: abre el asistente con los catálogos cargados', async ({ page }) => {
    await loginAs(page, { code: CONSEJERIA })
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

  test('caja no ve las páginas de consejería', async ({ page }) => {
    await loginAs(page, { code: '1002026603' })
    await expect(page.locator('.sidebar-nav').getByTitle('Maestros')).toHaveCount(0, { timeout: 15_000 })
    await page.goto('/consejeria/horarios')
    await expect(page.getByText('No tienes permiso')).toBeVisible({ timeout: 15_000 })
  })
})
