import { test, expect, loginAs } from './fixtures/auth'

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
    await expect(page.getByText('¿De dónde proviene el alumno?')).toHaveCount(0)

    await page.getByTestId('matricula-telefono').fill('88721992')
    await page.getByTestId('matricula-identidad').fill('0000000000000999')
    await expect(page.getByTestId('matricula-identidad')).toHaveValue('0000000000000')

    // el toast de error queda sobre el footer y se pausa si el mouse está encima
    await page.mouse.move(0, 0)
    await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, { timeout: 10_000 })
    await page.getByTestId('matricula-wizard-next').click()
    await expect(page.getByText('¿De dónde proviene el alumno?')).toBeVisible({ timeout: 8_000 })

    await page.getByTestId('matricula-otra-inst-no').click()
    const alergia = page.getByTestId('matricula-alergia')
    await expect(alergia).toBeVisible()
    await alergia.click()
    await alergia.fill('Maní')
    const option = page.getByRole('button', { name: /^Maní$/ }).or(page.getByRole('button', { name: /Usar «Maní»/ }))
    await expect(option.first()).toBeVisible({ timeout: 8_000 })
  })
})
