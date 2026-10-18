import { test, expect, loginAs } from './fixtures/auth'

// data_test.sql: `developer` = 1002026609 (único rol con `mantenimiento:put`);
// admin = 1002026100. El backend expone GET/PUT /mantenimiento y responde 503
// `MANTENIMIENTO` a todo lo demás mientras el modo está activo.
const DEVELOPER = '1002026609'
const ADMIN = '1002026100'

test.describe.configure({ mode: 'serial' })

test.describe('mantenimiento @critical', () => {
  test('activar bloquea a todos; desactivar restaura', async ({ page, browser }) => {
    // 1) El developer activa el modo mantenimiento.
    await loginAs(page, { code: DEVELOPER })
    await page.goto('/mantenimiento-admin')
    await expect(page.getByTestId('mantenimiento-switch')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('mantenimiento-switch').click()
    await page.getByTestId('mantenimiento-guardar').click()
    await expect(page.getByTestId('mantenimiento-confirm')).toBeVisible()
    await page
      .getByTestId('mantenimiento-confirm')
      .getByRole('button', { name: 'Activar', exact: true })
      .click()
    await expect(page.getByText('En mantenimiento')).toBeVisible({ timeout: 15_000 })

    // 2) Otro usuario (admin) queda bloqueado y es enviado a la pantalla de mantenimiento.
    const ctx = await browser.newContext()
    const bloqueado = await ctx.newPage()
    await loginAs(bloqueado, { code: ADMIN, home: /\/(dashboard|mantenimiento)/ })
    await expect(bloqueado).toHaveURL(/\/mantenimiento/, { timeout: 15_000 })
    await ctx.close()

    // 3) El developer (exento) desactiva y el sistema vuelve a estar disponible.
    await page.getByTestId('mantenimiento-switch').click()
    await page.getByTestId('mantenimiento-guardar').click()
    await expect(page.getByTestId('mantenimiento-confirm')).toBeVisible()
    await page
      .getByTestId('mantenimiento-confirm')
      .getByRole('button', { name: 'Desactivar', exact: true })
      .click()
    await expect(page.getByText('Disponible')).toBeVisible({ timeout: 15_000 })
  })
})
