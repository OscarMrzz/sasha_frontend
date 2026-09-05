import { test, expect } from './fixtures/auth'

async function waitLoginReady(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await expect(page.getByTestId('login-form')).toHaveAttribute('data-ready', '1', {
    timeout: 15_000,
  })
}

test.describe('smoke @smoke @critical', () => {
  test('proxy health responde ok', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.status).toBe('ok')
  })

  test('sin sesión redirige a login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/login/)
  })

  test('login inválido muestra error', async ({ page }) => {
    await waitLoginReady(page)
    await page.getByTestId('login-code').fill('0000000000')
    await page.getByTestId('login-password').fill('wrong')
    await page.getByTestId('login-submit').click()
    await expect(page.getByTestId('login-error')).toBeVisible({ timeout: 10_000 })
    await expect(page).toHaveURL(/login/)
  })

  test('login admin ok llega a dashboard', async ({ page }) => {
    await waitLoginReady(page)
    await page.getByTestId('login-code').fill('1002026100')
    await page.getByTestId('login-password').fill('Admin123!')
    await page.getByTestId('login-submit').click()
    await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 })
    await expect(page.getByTestId('session-code')).toContainText('1002026100')
  })

  test('menú admin muestra configuración y usuarios', async ({ page }) => {
    await waitLoginReady(page)
    await page.getByTestId('login-code').fill('1002026100')
    await page.getByTestId('login-password').fill('Admin123!')
    await page.getByTestId('login-submit').click()
    await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 })
    await expect(page.getByRole('link', { name: 'Configuración' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Usuarios' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Auditoría' })).toBeVisible()
  })

  test('no hay selector de rol en el shell', async ({ page }) => {
    await waitLoginReady(page)
    await page.getByTestId('login-code').fill('1002026100')
    await page.getByTestId('login-password').fill('Admin123!')
    await page.getByTestId('login-submit').click()
    await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 })
    await expect(page.getByTestId('active-role-select')).toHaveCount(0)
  })
})
