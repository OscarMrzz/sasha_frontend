import type { Page } from '@playwright/test'
import { test, expect, loginAs } from './fixtures/auth'

function todayLocalISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

async function openAsistenciaMaestro(page: Page) {
  await loginAs(page, { code: '1002026501', password: 'Admin123!' })
  await page.goto('/asistencia')
  await expect(page.getByTestId('asistencia-inline')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('heading', { name: /Asistencia · Español/i })).toBeVisible()
  await expect(page.locator('[data-testid="asistencia-semana-table"] tbody tr')).toHaveCount(12, {
    timeout: 15_000,
  })
}

test.describe('asistencia @smoke', () => {
  test('maestro ve la grilla de su clase directamente, sin tabla de materias', async ({ page }) => {
    await openAsistenciaMaestro(page)
    await expect(page.getByTestId('data-table-add-button')).toHaveCount(0)
    await expect(page.locator('.modal-backdrop')).toHaveCount(0)
    await expect(page.getByTestId('asistencia-leyenda')).toBeVisible()

    const hoy = todayLocalISO()
    const celdaHoy = page.getByTestId(`asistencia-celda-1002026701-${hoy}`)
    await expect(celdaHoy).toBeVisible()
    await expect(celdaHoy).toHaveAttribute('data-dia', 'hoy')
    const before = await celdaHoy.getAttribute('data-letra')
    await celdaHoy.click()
    await expect.poll(async () => celdaHoy.getAttribute('data-letra')).not.toBe(before)
    await expect(celdaHoy).toHaveAttribute('data-cambio', 'true')
  })

  test('los clics quedan en borrador: descartar pide confirmación', async ({ page }) => {
    await openAsistenciaMaestro(page)
    const guardar = page.getByTestId('asistencia-guardar')
    await expect(guardar).toBeDisabled()

    const celda = page.getByTestId(`asistencia-celda-1002026701-${todayLocalISO()}`)
    const before = await celda.getAttribute('data-letra')
    await celda.click()
    await expect(guardar).toHaveText('Guardar (1)')

    await page.getByTestId('asistencia-descartar').click()
    await page
      .getByRole('dialog', { name: 'Cambios sin guardar' })
      .getByRole('button', { name: 'Descartar' })
      .click()
    await expect(guardar).toBeDisabled()
    await expect(celda).toHaveAttribute('data-letra', before ?? '')
  })

  test('Guardar confirma y persiste la lista', async ({ page }) => {
    await openAsistenciaMaestro(page)
    const guardar = page.getByTestId('asistencia-guardar')
    const celda = page.getByTestId(`asistencia-celda-1002026712-${todayLocalISO()}`)
    const original = (await celda.getAttribute('data-letra')) ?? ''

    const confirmarGuardar = async () => {
      await guardar.click()
      await page
        .getByRole('dialog', { name: 'Guardar asistencia' })
        .getByRole('button', { name: 'Guardar', exact: true })
        .click()
      await expect(page.getByText('Asistencia guardada').last()).toBeVisible({ timeout: 15_000 })
      await expect(guardar).toBeDisabled()
    }

    await celda.click()
    const nueva = await celda.getAttribute('data-letra')
    await confirmarGuardar()
    await expect(celda).toHaveAttribute('data-letra', nueva ?? '')
    await expect(celda).not.toHaveAttribute('data-cambio', 'true')

    // Deja la celda como estaba.
    for (let i = 0; i < 5 && (await celda.getAttribute('data-letra')) !== original; i++) {
      await celda.click()
    }
    await expect(celda).toHaveAttribute('data-letra', original)
    await confirmarGuardar()
  })

  test('vista Día viene por defecto y Semana muestra toda la semana', async ({ page }) => {
    await openAsistenciaMaestro(page)
    await expect(page.getByTestId('asistencia-vista-dia')).toBeChecked()
    const columnas = page.locator('[data-testid="asistencia-semana-table"] thead th')

    await page.getByText('Semana', { exact: true }).click()
    await expect(page.getByTestId('asistencia-vista-semana')).toBeChecked()
    const totalSemana = await columnas.count()
    expect(totalSemana).toBeGreaterThan(3)

    await page.getByText('Día', { exact: true }).click()
    const hoy = todayLocalISO()
    const sinClase = page.getByTestId('asistencia-dia-sin-clase')
    if (await sinClase.count()) {
      await expect(sinClase).toContainText(hoy)
    } else {
      await expect(columnas).toHaveCount(3)
      await expect(page.getByTestId(`asistencia-celda-1002026701-${hoy}`)).toBeVisible()
    }

    await page.getByText('Semana', { exact: true }).click()
    await expect(columnas).toHaveCount(totalSemana)
  })

  test('días futuros no son editables', async ({ page }) => {
    await openAsistenciaMaestro(page)

    const futuros = page.locator(
      '[data-testid="asistencia-semana-table"] button.asistencia-celda[data-dia="futuro"]',
    )
    await expect(futuros).toHaveCount(0)

    const futuroRo = page
      .locator(
        '[data-testid="asistencia-semana-table"] .asistencia-celda--futuro[data-dia="futuro"]',
      )
      .first()
    const countFuturo = await page
      .locator(
        '[data-testid="asistencia-semana-table"] .asistencia-celda[data-dia="futuro"]',
      )
      .count()
    if (countFuturo > 0) {
      await expect(futuroRo).toBeVisible()
      await expect(futuroRo).toHaveClass(/asistencia-celda--futuro/)
    }
  })

  test('maestro abre modal Inasistencias', async ({ page }) => {
    await openAsistenciaMaestro(page)
    await page.getByTestId('asistencia-ver-faltas').click()
    await expect(page.getByTestId('asistencia-inasistencias-modal')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('[data-testid="asistencia-inasistencias-modal"] tbody tr')).toHaveCount(
      12,
      { timeout: 10_000 },
    )
  })

  test('consejeria solo Ver e Inasistencias sin Asistencia ni Editar', async ({ page }) => {
    await loginAs(page, { code: '1002026602', password: 'Admin123!' })
    await page.getByRole('link', { name: 'Asistencia' }).click()
    await expect(page.getByRole('heading', { name: /Asistencia/i })).toBeVisible({
      timeout: 15_000,
    })
    const row = page.locator('table.data-table tbody tr').first()
    await expect(row).toBeVisible({ timeout: 15_000 })
    await row.click({ button: 'right' })
    await expect(page.getByTestId('asistencia-ctx-ver')).toBeVisible()
    await expect(page.getByTestId('asistencia-ctx-inasistencias')).toBeVisible()
    await expect(page.getByTestId('asistencia-ctx-pasar')).toHaveCount(0)
    await expect(page.getByTestId('asistencia-ctx-editar')).toHaveCount(0)
  })
})
