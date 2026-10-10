import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { unzipSync } from 'fflate'
import type { Page } from '@playwright/test'
import { test, expect, loginAs } from './fixtures/auth'

/**
 * 003-documentos-matricula (frontend).
 * Al confirmar la matrícula el wizard descarga un único ZIP `<Nombre> <código>.zip`
 * con los documentos; ya no se descargan `alumno-<code>.pdf`/`responsable-<code>.pdf`.
 * 004: el contrato del periodo es un archivo `.docx`/`.pdf` subido a la bóveda (multipart).
 */

/** Fixture `.docx` real para sembrar/verificar el contrato de matrícula. */
const CONTRATO_DOCX = fileURLToPath(
  new URL('./fixtures/ejemplo-contrato-matricula.docx', import.meta.url),
)
const CONTRATO_DOCX_BYTES = readFileSync(CONTRATO_DOCX)

async function abrirWizard(page: Page) {
  await page.getByRole('link', { name: 'Matrícula' }).click()
  await expect(page).toHaveURL(/matricula/)
  await page.getByRole('button', { name: 'Nueva matrícula' }).click()
  await expect(page.getByRole('heading', { name: 'Nueva matrícula' })).toBeVisible()
}

async function elegirPrimeraOpcion(page: Page, testId: string) {
  await page.getByTestId(testId).click()
  await page.locator('.combobox__option').first().click()
}

test.describe('matrícula · carpeta de documentos', () => {
  test('admin: descarga un único ZIP al matricular con responsable nuevo', async ({ page }) => {
    await loginAs(page)

    const descargas: string[] = []
    page.on('download', (d) => descargas.push(d.suggestedFilename()))

    await abrirWizard(page)

    // Paso 1 · Alumno
    await page.getByTestId('matricula-primer-nombre').fill('Zoe')
    await page.getByTestId('matricula-primer-apellido').fill('Pruebazip')
    await page.getByTestId('matricula-sexo').click()
    await page.getByRole('button', { name: 'Femenino' }).click()
    await page.getByTestId('matricula-fecha-nacimiento').fill('2015-03-10')
    await page.getByTestId('matricula-telefono').fill('88721992')
    await page.getByTestId('matricula-wizard-next').click()

    // Paso 2 · Historial
    await expect(page.getByTestId('matricula-otra-inst-no')).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('matricula-otra-inst-no').click()
    await page.getByTestId('matricula-wizard-next').click()

    // Paso 3 · Académico
    await expect(page.getByText('Datos académicos')).toBeVisible({ timeout: 10_000 })
    await elegirPrimeraOpcion(page, 'matricula-periodo')
    await elegirPrimeraOpcion(page, 'matricula-grado')
    await elegirPrimeraOpcion(page, 'matricula-modalidad')
    await page.getByTestId('matricula-retrasados-no').click()
    await page.getByTestId('matricula-wizard-next').click()

    // Paso 4 · Responsables (uno nuevo)
    await expect(
      page.locator('.wizard-pane__title').filter({ hasText: 'Responsables' }),
    ).toBeVisible({ timeout: 10_000 })
    const panel = page.getByTestId('matricula-responsable-0')
    await panel.getByRole('button', { name: 'No, es nuevo' }).click()
    await page.getByTestId('matricula-resp-nombre').fill('Carlos')
    await panel.locator('.field', { hasText: 'Primer apellido' }).locator('input').fill('Perez')
    const parentesco = panel.locator('.field', { hasText: 'Parentesco' }).locator('input')
    await parentesco.fill('Madre')
    await parentesco.press('Enter')
    await page.getByTestId('matricula-wizard-next').click()

    // Paso 5 · Foto (opcional)
    await expect(
      page.locator('.wizard-pane__title').filter({ hasText: 'Fotografía' }),
    ).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('matricula-wizard-next').click()

    // Paso 6 · Confirmar
    await expect(page.getByText('Revisión final')).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('matricula-wizard-finish').click()

    const descargaPromise = page.waitForEvent('download', { timeout: 45_000 })
    await page
      .getByRole('dialog', { name: 'Confirmar matrícula' })
      .getByRole('button', { name: 'Confirmar' })
      .click()

    const descarga = await descargaPromise
    expect(descarga.suggestedFilename()).toMatch(/^Zoe Pruebazip .+\.zip$/)

    // El ZIP incluye el archivo real del contrato de matrícula del periodo.
    const zipPath = await descarga.path()
    const zipEntries = unzipSync(new Uint8Array(readFileSync(zipPath)))
    expect(Object.keys(zipEntries)).toContain('3-contrato-matricula.docx')

    // Solo se descargó el ZIP (sin PDFs sueltos de credenciales).
    expect(descargas.filter((f) => f.endsWith('.zip'))).toHaveLength(1)
    expect(descargas.every((f) => f.endsWith('.zip'))).toBe(true)

    await expect(page.getByTestId('matricula-zip')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('matricula-created-code')).not.toBeEmpty()
  })

  test('admin: Catálogo → Periodos lista y guarda un contrato de matrícula', async ({ page }) => {
    await loginAs(page)

    // Sembramos un contrato de tipo matrícula vía API (misma sesión del navegador).
    // 004: el alta es multipart (`archivo` obligatorio + metadatos).
    const res = await page.request.post('/api/contratos/', {
      headers: { 'X-Active-Role': 'admin' },
      multipart: {
        titulo: 'Contrato Matrícula E2E',
        tipo: 'matricula',
        visibilidad: 'privado',
        archivo: {
          name: 'contrato-e2e.docx',
          mimeType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          buffer: CONTRATO_DOCX_BYTES,
        },
      },
    })
    expect(res.ok()).toBeTruthy()

    await page.goto('/catalogos/periodos')
    const row = page.locator('table tbody tr').first()
    await expect(row).toBeVisible({ timeout: 15_000 })
    await row.click({ button: 'right' })
    await page.getByRole('button', { name: 'Editar' }).click()

    const selector = page.getByTestId('periodo-contrato-matricula')
    await expect(selector).toBeVisible({ timeout: 10_000 })
    await selector.click()
    const opcion = page.getByRole('button', { name: 'Contrato Matrícula E2E' })
    await expect(opcion).toBeVisible({ timeout: 10_000 })
    await opcion.click()

    await page.getByRole('button', { name: 'Guardar' }).click()
    await page
      .getByRole('dialog', { name: 'Confirmar guardado' })
      .getByRole('button', { name: 'Confirmar' })
      .click()

    // El listado refleja el título del contrato guardado.
    await expect(page.getByText('Contrato Matrícula E2E').first()).toBeVisible({ timeout: 15_000 })
  })
})
