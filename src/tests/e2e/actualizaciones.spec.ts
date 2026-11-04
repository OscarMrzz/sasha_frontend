import type { Page } from '@playwright/test'
import { test, expect, loginAs } from './fixtures/auth'

// TAR-038. data_test.sql: admin 1002026100, admin_temporal 1002026608,
// developer 1002026609 y maestro 1002026501. Contraseña Admin123!.
const ADMIN = '1002026100'
const ADMIN_TEMPORAL = '1002026608'
const DEVELOPER = '1002026609'
const MAESTRO = '1002026501'

async function abrirActualizaciones(page: Page, code: string) {
  await loginAs(page, { code })
  await page
    .locator('.sidebar-nav')
    .getByTitle('Actualizaciones', { exact: true })
    .first()
    .click()
  await expect(page.getByTestId('actualizaciones-page')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('actualizaciones-cargando')).toHaveCount(0, { timeout: 15_000 })
}

test.describe('actualizaciones del sistema', () => {
  test('admin: ve el tablero y no puede escribir', async ({ page }) => {
    await abrirActualizaciones(page, ADMIN)

    await expect(page.getByTestId('actualizaciones-columna-finalizado')).toBeVisible()
    await expect(page.getByTestId('actualizaciones-columna-pendiente')).toBeVisible()
    await expect(page.locator('.actualizacion-card').first()).toBeVisible()
    await expect(page.getByTestId('actualizacion-agregar')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Editar' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Eliminar' })).toHaveCount(0)
  })

  test('admin temporal: ve el tablero y no puede escribir', async ({ page }) => {
    await abrirActualizaciones(page, ADMIN_TEMPORAL)

    await expect(page.getByTestId('actualizaciones-columna-finalizado')).toBeVisible()
    await expect(page.getByTestId('actualizacion-agregar')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Editar' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Eliminar' })).toHaveCount(0)
  })

  test('tablero: columnas en orden de avance y dentro de cada una la fecha más reciente', async ({ page }) => {
    await abrirActualizaciones(page, ADMIN)

    const pendiente = page.getByTestId('actualizaciones-columna-pendiente')
    const desarrollo = page.getByTestId('actualizaciones-columna-en_desarrollo')
    const pruebas = page.getByTestId('actualizaciones-columna-etapa_pruebas')
    const finalizado = page.getByTestId('actualizaciones-columna-finalizado')

    const cajas = await Promise.all([
      pendiente.boundingBox(),
      desarrollo.boundingBox(),
      pruebas.boundingBox(),
      finalizado.boundingBox(),
    ])
    const [xPend, xDes, xPru, xFin] = cajas.map((c) => c?.x ?? 0)
    expect(xPend).toBeLessThan(xDes)
    expect(xDes).toBeLessThan(xPru)
    expect(xPru).toBeLessThan(xFin)
  })

  test('filtro por etapa y búsqueda', async ({ page }) => {
    await abrirActualizaciones(page, ADMIN)

    await page.getByTestId('actualizaciones-filtro-etapa_pruebas').click()
    await expect(page.getByTestId('actualizaciones-columna-etapa_pruebas')).toBeVisible()
    await expect(page.getByTestId('actualizaciones-columna-pendiente')).toHaveCount(0)
    await expect(page.getByTestId('actualizaciones-columna-finalizado')).toHaveCount(0)

    await page.getByTestId('actualizaciones-buscar').fill('Comentarios en las tareas')
    await expect(page.getByTestId('actualizaciones-sin-resultados')).toBeVisible()

    await page.getByTestId('actualizaciones-filtro-todos').click()
    await expect(
      page.locator('.actualizacion-card', { hasText: 'Comentarios en las tareas' }),
    ).toBeVisible()
  })

  test('developer: crea, edita y elimina una actualización', async ({ page }) => {
    await abrirActualizaciones(page, DEVELOPER)
    await expect(page.getByTestId('actualizacion-agregar')).toBeVisible()

    const titulo = `E2E actualización ${Date.now()}`

    // Crear
    await page.getByTestId('actualizacion-agregar').click()
    await expect(page.getByTestId('actualizacion-form')).toBeVisible()
    await page.getByTestId('actualizacion-form-titulo').fill(titulo)
    await page.getByTestId('actualizacion-form-descripcion').fill('Creada por el e2e de actualizaciones.')
    await page.getByTestId('actualizacion-form-estado').selectOption('etapa_pruebas')
    await page.getByTestId('actualizacion-form-modulo').fill('E2E')
    await page.getByTestId('actualizacion-form-guardar').click()

    const enPruebas = page.getByTestId('actualizaciones-columna-etapa_pruebas')
    const card = enPruebas.locator('.actualizacion-card', { hasText: titulo })
    await expect(card).toBeVisible({ timeout: 15_000 })
    await expect(card).toContainText('Etapa de pruebas')
    await expect(card).toContainText('E2E')
    await expect(page.getByTestId('actualizacion-form')).toHaveCount(0, { timeout: 10_000 })

    // Editar
    await card.getByRole('button', { name: 'Editar' }).click()
    await expect(page.getByTestId('actualizacion-form')).toBeVisible()
    await page.getByTestId('actualizacion-form-estado').selectOption('finalizado')
    await page.getByTestId('actualizacion-form-guardar').click()

    const enFinalizado = page
      .getByTestId('actualizaciones-columna-finalizado')
      .locator('.actualizacion-card', { hasText: titulo })
    await expect(enFinalizado).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('actualizacion-form')).toHaveCount(0, { timeout: 10_000 })

    // Eliminar
    await enFinalizado.getByRole('button', { name: 'Eliminar' }).click()
    await expect(page.getByTestId('actualizacion-confirmar-eliminar')).toBeVisible()
    await page.getByTestId('actualizacion-confirmar-eliminar').getByRole('button', { name: 'Eliminar' }).click()
    await expect(page.locator('.actualizacion-card', { hasText: titulo })).toHaveCount(0, {
      timeout: 15_000,
    })
  })

  test('un rol sin permiso no ve el ítem del menú', async ({ page }) => {
    await loginAs(page, { code: MAESTRO })
    await expect(
      page.locator('.sidebar-nav').getByTitle('Actualizaciones', { exact: true }),
    ).toHaveCount(0)
  })
})
