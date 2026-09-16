import { test, expect, loginAs } from './fixtures/auth'

test.describe('modulos @critical', () => {
  test('configuracion carga para admin', async ({ page }) => {
    await loginAs(page)
    await page.getByRole('link', { name: 'Configuración' }).click()
    await expect(page).toHaveURL(/configuracion/)
    await expect(page.getByText(/Configuraci|instituci/i).first()).toBeVisible()
  })

  test('usuarios muestra tabla y alta en modal', async ({ page }) => {
    await loginAs(page)
    await page.getByRole('link', { name: 'Usuarios' }).click()
    await expect(page.getByRole('heading', { name: 'Usuarios' })).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('data-table-add-button').click()
    await expect(page.getByLabel(/Primer nombre/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('usuarios ver abre ficha y descargar ofrece excel o pdf', async ({ page }) => {
    await loginAs(page)
    await page.getByRole('link', { name: 'Usuarios' }).click()
    await expect(page.getByRole('heading', { name: 'Usuarios' })).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('data-table-download').click()
    await expect(page.getByRole('menuitem', { name: /Excel/i })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'PDF' })).toBeVisible()
    await page.getByRole('heading', { name: 'Usuarios' }).click()
    const row = page.locator('table.data-table tbody tr').first()
    await row.click({ button: 'right' })
    await expect(page.getByRole('button', { name: 'Ver' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Editar' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Eliminar' })).toBeVisible()
    await page.getByRole('button', { name: 'Ver' }).click()
    await expect(page.getByTestId('user-ficha')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('ficha-download-pdf')).toBeVisible()
  })

  test('usuarios ficha operativa alumno y maestro', async ({ page }) => {
    await loginAs(page)
    await page.getByRole('link', { name: 'Usuarios' }).click()
    await expect(page.getByRole('heading', { name: 'Usuarios' })).toBeVisible({ timeout: 10_000 })

    await page.getByTestId('data-table-filter-rol').selectOption('alumno')
    const alumnoRow = page.locator('table.data-table tbody tr').first()
    await expect(alumnoRow).toBeVisible({ timeout: 10_000 })
    await alumnoRow.click({ button: 'right' })
    await page.getByRole('button', { name: 'Ver' }).click()
    await expect(page.getByTestId('user-ficha')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('ficha-clase-actual')).toBeVisible()
    await expect(page.getByTestId('ficha-ver-horario-semana')).toBeVisible()
    await expect(page.getByTestId('ficha-ver-tareas')).toBeVisible()
    await page.getByRole('button', { name: 'Cerrar' }).click()

    await page.getByTestId('data-table-filter-rol').selectOption('maestro')
    const maestroRow = page.locator('table.data-table tbody tr').first()
    await expect(maestroRow).toBeVisible({ timeout: 10_000 })
    await maestroRow.click({ button: 'right' })
    await page.getByRole('button', { name: 'Ver' }).click()
    await expect(page.getByTestId('user-ficha')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('ficha-clase-actual')).toBeVisible()
    await expect(page.getByTestId('ficha-ver-horario-semana')).toBeVisible()
    await expect(page.getByTestId('ficha-ver-plan-periodo')).toBeVisible()
    await expect(page.getByTestId('ficha-maestro-cursos')).toBeVisible()
  })

  test('cursos ver lista maestros y asignar abre modal con curso fijo', async ({ page }) => {
    await loginAs(page)
    await page.getByRole('link', { name: 'Cursos' }).click()
    await expect(page.getByRole('heading', { name: 'Cursos' })).toBeVisible({ timeout: 10_000 })

    const row = page.locator('table.data-table tbody tr').filter({ hasText: 'Español' }).first()
    await expect(row).toBeVisible({ timeout: 10_000 })
    await row.click({ button: 'right' })
    await expect(page.getByRole('button', { name: 'Ver' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Asignar maestro' })).toBeVisible()

    await page.getByRole('button', { name: 'Ver' }).click()
    await expect(page.getByRole('heading', { name: 'Español' })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Maestros asignados')).toBeVisible()
    await expect(page.getByTestId('curso-ver-maestros')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Descargar PDF' })).toBeVisible()
    await page.getByRole('button', { name: 'Cerrar' }).click()

    await row.click({ button: 'right' })
    await page.getByRole('button', { name: 'Asignar maestro' }).click()
    await expect(page.getByTestId('asignacion-periodo-select')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('asignacion-curso-fijo')).toHaveValue('Español')
    await expect(page.getByTestId('asignacion-periodo-select').getByRole('option').first()).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(page.getByTestId('asignacion-periodo-select').getByRole('option').first()).toContainText(/activo/i)
    await expect(page.getByTestId('asignacion-maestro-select')).toBeVisible()
    await expect(page.getByTestId('asignacion-grado-select')).toBeVisible()
    await expect(page.getByTestId('asignacion-seccion-select')).toBeVisible()

    // Periodo inactivo (seed) tiene todas las secciones de Español cubiertas → sin grados libres
    const inactivo = page
      .getByTestId('asignacion-periodo-select')
      .getByRole('option')
      .filter({ hasText: /inactivo/i })
      .first()
    if (await inactivo.count()) {
      await inactivo.click()
      await expect(page.getByTestId('asignacion-grado-select')).toContainText(/ya están asignadas/i)

      // Volver al activo: debe haber grados libres (sin asignaciones en ese periodo)
      await page
        .getByTestId('asignacion-periodo-select')
        .getByRole('option')
        .filter({ hasText: /activo/i })
        .first()
        .click()
      await expect(page.getByTestId('asignacion-grado-select').getByRole('option').first()).toBeVisible({
        timeout: 10_000,
      })
    }
  })

  test('matricula, horarios, pagos, sace navegables', async ({ page }) => {
    await loginAs(page)
    for (const name of ['Matrícula', 'Horarios', 'Pagos', 'Export SACE', 'Estadísticas']) {
      await page.getByRole('link', { name }).click()
      await expect(page.getByRole('heading', { level: 1 }).or(page.locator('.page-title'))).toBeVisible()
    }
  })

  test('auditoria accesible con admin', async ({ page }) => {
    await loginAs(page)
    await page.getByRole('link', { name: 'Auditoría' }).click()
    await expect(page).toHaveURL(/auditoria/)
  })
})
