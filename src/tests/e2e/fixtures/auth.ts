import { test as base, expect, type Page } from '@playwright/test'

export async function loginAs(
  page: Page,
  opts: { code?: string; password?: string } = {},
) {
  const code = opts.code ?? '1002026100'
  const password = opts.password ?? 'Admin123!'

  await page.goto('/login')
  await expect(page.getByTestId('login-form')).toHaveAttribute('data-ready', '1', {
    timeout: 15_000,
  })
  await page.getByTestId('login-code').fill(code)
  await page.getByTestId('login-password').fill(password)
  await page.getByTestId('login-submit').click()
  await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 })
}

export const test = base
export { expect }
