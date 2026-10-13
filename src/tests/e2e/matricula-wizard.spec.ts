import type { Page } from '@playwright/test'
import { test, expect, loginAs } from './fixtures/auth'

async function elegirPrimeraOpcion(page: Page, testId: string) {
  await page.getByTestId(testId).click()
  await page.locator('.combobox__option').first().click()
}

/** Recorre el wizard (alumno → historial → académico → responsables → foto) hasta «Confirmar». */
async function irAlPasoConfirmar(page: Page) {
  await page.getByRole('link', { name: 'Matrícula' }).click()
  await expect(page).toHaveURL(/matricula/)
  await page.getByRole('button', { name: 'Nueva matrícula' }).click()
  await expect(page.getByRole('heading', { name: 'Nueva matrícula' })).toBeVisible()

  // Paso 1 · Alumno
  await page.getByTestId('matricula-primer-nombre').fill('Beca')
  await page.getByTestId('matricula-primer-apellido').fill('Prueba')
  await page.getByTestId('matricula-sexo').click()
  await page.getByRole('button', { name: 'Femenino' }).click()
  await page.getByTestId('matricula-fecha-nacimiento').fill('2015-03-10')
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
}

test.describe('matricula wizard @critical', () => {
  test('sin tipo documento, teléfono 8 dígitos y alergia combobox', async ({ page }) => {
    await loginAs(page)
    await page.getByRole('link', { name: 'Matrícula' }).click()
    await expect(page).toHaveURL(/matricula/)
    await page.getByRole('button', { name: 'Nueva matrícula' }).click()
    await expect(page.getByRole('heading', { name: 'Nueva matrícula' })).toBeVisible()

    await expect(page.getByText('Tipo documento')).toHaveCount(0)
    await expect(page.getByTestId('matricula-telefono')).toHaveAttribute('placeholder', '88721992')
    await expect(page.getByTestId('matricula-identidad')).toHaveAttribute('placeholder', '1804199704869')

    await page.getByTestId('matricula-primer-nombre').fill('Ana')
    await page.getByTestId('matricula-primer-apellido').fill('Lopez')
    await page.getByTestId('matricula-sexo').click()
    await page.getByRole('button', { name: 'Femenino' }).click()
    await page.getByTestId('matricula-fecha-nacimiento').fill('2015-03-10')

    await page.getByTestId('matricula-telefono').fill('123')
    await page.getByTestId('matricula-wizard-next').click()
    await expect(page.getByText(/8 dígitos/i)).toBeVisible({ timeout: 8_000 })
    await expect(page.getByText('Datos del alumno')).toBeVisible()
    await expect(page.getByTestId('matricula-otra-inst-no')).toHaveCount(0)

    await page.getByTestId('matricula-telefono').fill('88721992')
    await page.getByTestId('matricula-identidad').fill('0000000000000999')
    await expect(page.getByTestId('matricula-identidad')).toHaveValue('0000000000000')

    // el toast de error queda sobre el footer y se pausa si el mouse está encima
    await page.mouse.move(0, 0)
    await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, { timeout: 10_000 })
    await page.getByTestId('matricula-wizard-next').click()
    await expect(page.getByTestId('matricula-otra-inst-no')).toBeVisible({ timeout: 8_000 })

    await page.getByTestId('matricula-otra-inst-no').click()
    const alergia = page.getByTestId('matricula-alergia')
    await expect(alergia).toBeVisible()
    await alergia.click()
    await alergia.fill('Maní')
    const option = page.getByRole('button', { name: /^Maní$/ }).or(page.getByRole('button', { name: /Usar «Maní»/ }))
    await expect(option.first()).toBeVisible({ timeout: 8_000 })
  })

  test('admin edita una matrícula desde el clic derecho', async ({ page }) => {
    await loginAs(page)
    await page.goto('/matricula')
    await expect(page.getByRole('heading', { name: 'Matrícula' })).toBeVisible({ timeout: 15_000 })

    const row = page.locator('table.data-table tbody tr').first()
    await expect(row).toBeVisible()
    await row.click({ button: 'right' })
    await page.getByTestId('ctx-editar').click()

    await expect(page.getByRole('heading', { name: 'Editar alumno' })).toBeVisible()
    await expect(page.getByTestId('matricula-edit-seccion')).toBeVisible()
    await expect(page.getByTestId('persona-edit-save')).toBeVisible()
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByRole('heading', { name: 'Editar alumno' })).toHaveCount(0)
  })

  test('último paso: elige la beca y se refleja en el resumen', async ({ page }) => {
    await loginAs(page)
    await irAlPasoConfirmar(page)

    // Por defecto la beca es normal y se muestra en el resumen.
    const resumen = page.getByTestId('beca-resumen')
    await expect(resumen).toBeVisible()
    await expect(resumen).toContainText('Normal')

    // El modal permite elegir entre las 4 opciones y la especial pide el monto.
    await page.getByTestId('beca-btn').click()
    const modal = page.getByTestId('beca-modal')
    await expect(modal).toBeVisible()
    await modal.getByTestId('beca-op-especial').click()
    await expect(modal.getByTestId('beca-monto-especial')).toBeVisible()

    // Se elige media beca y el resumen la refleja.
    await modal.getByTestId('beca-op-media').click()
    await modal.getByRole('button', { name: 'Listo' }).click()
    await expect(modal).toHaveCount(0)
    await expect(resumen).toContainText('Media beca')
  })
})
