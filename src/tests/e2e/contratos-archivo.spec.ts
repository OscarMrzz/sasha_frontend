import { fileURLToPath } from 'node:url'
import { test, expect, loginAs } from './fixtures/auth'
import type { Browser, Page } from '@playwright/test'

/**
 * 004-contratos-archivo (frontend).
 * Un contrato es un archivo `.docx`/`.pdf` subido a la bóveda: alta multipart,
 * vista previa, descarga, privacidad por autor y bloqueo por permiso.
 */
const DIRECTOR = '1002026601'
const SECRETARIA = '1002026607'
const ADMIN = '1002026100'
const MAESTRO = '1002026501'
const CONSEJERIA = '1002026602'

/** Fixture `.docx` real usado para la subida en el modal de alta. */
const CONTRATO_DOCX = fileURLToPath(
  new URL('./fixtures/ejemplo-contrato-matricula.docx', import.meta.url),
)
const ARCHIVO_DOCX = 'ejemplo-contrato-matricula.docx'

function tituloUnico(prefijo: string) {
  return `${prefijo} ${Date.now()}`
}

/** Contexto aislado por rol (cada uno con su propia sesión). */
async function sesion(browser: Browser, code: string) {
  const ctx = await browser.newContext({ baseURL: test.info().project.use.baseURL })
  const page = await ctx.newPage()
  await loginAs(page, { code })
  return { ctx, page }
}

async function irAContratos(page: Page) {
  await page.goto('/contratos')
  await expect(page.getByTestId('contratos-page')).toBeVisible({ timeout: 15_000 })
}

/** Combobox: abre por testid y elige la opción por su etiqueta visible. */
async function elegirOpcion(page: Page, testId: string, label: string) {
  await page.getByTestId(testId).click()
  await page.getByRole('button', { name: label, exact: true }).click()
}

async function crearContrato(
  page: Page,
  titulo: string,
  tipoLabel: string,
  visibilidadLabel: string,
) {
  await page.getByTestId('contratos-add').click()
  await expect(page.getByTestId('contrato-add')).toBeVisible()
  await page.getByTestId('contrato-titulo').fill(titulo)
  await elegirOpcion(page, 'contrato-tipo', tipoLabel)
  await elegirOpcion(page, 'contrato-visibilidad', visibilidadLabel)
  await page.getByTestId('contrato-archivo-input').setInputFiles(CONTRATO_DOCX)
  await page.getByTestId('contrato-guardar').click()
  await expect(page.getByTestId('contrato-add')).toBeHidden({ timeout: 15_000 })
}

function filaPorTitulo(page: Page, titulo: string) {
  return page.locator('table.data-table tbody tr', { hasText: titulo })
}

/** Localiza el contrato por su título, lo elimina desde el menú contextual y espera a que desaparezca. */
async function eliminarContrato(page: Page, titulo: string) {
  await page.getByTestId('data-table-search').fill(titulo)
  const fila = filaPorTitulo(page, titulo)
  await expect(fila).toBeVisible({ timeout: 15_000 })
  await fila.click({ button: 'right' })
  await expect(page.getByTestId('contratos-ctx')).toBeVisible()
  await page.getByTestId('contrato-ctx-eliminar').click()
  await page
    .getByRole('dialog', { name: 'Eliminar contrato' })
    .getByRole('button', { name: 'Eliminar' })
    .click()
  await expect(fila).toHaveCount(0, { timeout: 15_000 })
}

test.describe('contratos como archivo (004)', () => {
  test('director: alta, lista, ver y descargar el contrato', async ({ page }) => {
    await loginAs(page, { code: DIRECTOR })
    await irAContratos(page)

    const titulo = tituloUnico('Contrato E2E')
    await crearContrato(page, titulo, 'Otros', 'Público')

    // La nueva fila aparece con el nombre del archivo subido.
    await page.getByTestId('data-table-search').fill(titulo)
    const fila = filaPorTitulo(page, titulo)
    await expect(fila).toBeVisible({ timeout: 15_000 })
    await expect(fila).toContainText(ARCHIVO_DOCX)

    // «Ver» desde el menú contextual abre la vista previa del `.docx`.
    await fila.click({ button: 'right' })
    await expect(page.getByTestId('contratos-ctx')).toBeVisible()
    await page.getByTestId('contrato-ctx-ver').click()
    await expect(page.getByTestId('contrato-preview-docx')).toBeVisible({ timeout: 15_000 })

    // Descarga el original y conserva la extensión `.docx`.
    const descargaPromise = page.waitForEvent('download', { timeout: 15_000 })
    await page.getByTestId('contrato-descargar').click()
    const descarga = await descargaPromise
    expect(descarga.suggestedFilename()).toMatch(/\.docx$/)

    await page
      .getByRole('dialog', { name: titulo })
      .getByRole('button', { name: 'Cerrar' })
      .click()
    await expect(page.getByRole('dialog', { name: titulo })).toBeHidden()

    // Limpieza: elimina el contrato creado.
    await eliminarContrato(page, titulo)
  })

  test('privacidad: un contrato privado no lo ve la secretaria pero sí el admin', async ({
    page,
    browser,
  }) => {
    await loginAs(page, { code: DIRECTOR })
    await irAContratos(page)

    const titulo = tituloUnico('Contrato privado E2E')
    await crearContrato(page, titulo, 'Otros', 'Privado')

    // Secretaria: mismo `contratos:get`, pero no es la autora → no lo ve.
    const sec = await sesion(browser, SECRETARIA)
    try {
      await irAContratos(sec.page)
      await sec.page.getByTestId('data-table-search').fill(titulo)
      await expect(filaPorTitulo(sec.page, titulo)).toHaveCount(0)
    } finally {
      await sec.ctx.close()
    }

    // Admin: sí lo ve.
    const adm = await sesion(browser, ADMIN)
    try {
      await irAContratos(adm.page)
      await adm.page.getByTestId('data-table-search').fill(titulo)
      await expect(filaPorTitulo(adm.page, titulo)).toBeVisible({ timeout: 15_000 })
    } finally {
      await adm.ctx.close()
    }

    // Limpieza como director (autor).
    await eliminarContrato(page, titulo)
  })

  test('maestro sin permiso: no ve el ítem ni puede abrir /contratos', async ({ page }) => {
    await loginAs(page, { code: MAESTRO })

    await page.goto('/dashboard')
    await expect(page.getByRole('link', { name: 'Contratos' })).toHaveCount(0)

    await page.goto('/contratos')
    await expect(page.getByText(/No tienes permiso/)).toBeVisible({ timeout: 15_000 })
  })

  test('consejería sin permiso: no ve el ítem ni puede abrir /contratos', async ({ page }) => {
    await loginAs(page, { code: CONSEJERIA })

    await page.goto('/dashboard')
    await expect(page.getByRole('link', { name: 'Contratos' })).toHaveCount(0)

    await page.goto('/contratos')
    await expect(page.getByText(/No tienes permiso/)).toBeVisible({ timeout: 15_000 })
  })

  test('buscador, filtro por tipo y menú de descarga', async ({ page }) => {
    await loginAs(page, { code: DIRECTOR })
    await irAContratos(page)

    const filas = page.locator('table.data-table tbody tr')
    await expect(filas.first()).toBeVisible({ timeout: 15_000 })

    // Placeholder unificado (REG-UI-11).
    await expect(page.getByTestId('data-table-search')).toHaveAttribute('placeholder', 'Buscar…')

    // El filtro por tipo solo deja filas con ese tipo.
    const tipoFilter = page.getByTestId('data-table-filter-tipo')
    await expect(tipoFilter).toBeVisible()
    const primerTipo = await tipoFilter.locator('option').nth(1).getAttribute('value')
    if (primerTipo) {
      await tipoFilter.selectOption(primerTipo)
      const celdasTipo = page.locator('table.data-table tbody tr td:nth-child(3)')
      const total = await celdasTipo.count()
      expect(total).toBeGreaterThan(0)
      for (let i = 0; i < total; i++) {
        await expect(celdasTipo.nth(i)).toHaveText(primerTipo)
      }
      await tipoFilter.selectOption('')
    }

    // El buscador filtra por texto.
    await page.getByTestId('data-table-search').fill('zzz-sin-resultados-e2e')
    await expect(page.getByText('Sin resultados')).toBeVisible()
    await page.getByTestId('data-table-search').fill('')

    // El menú de descarga ofrece Excel/CSV.
    await page.getByTestId('data-table-download').click()
    await expect(page.getByRole('menuitem', { name: 'Excel (.csv)' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'PDF' })).toBeVisible()
  })
})
