import { test as base, expect, type Page } from '@playwright/test'

/** Códigos de fixture con rol maestro (home = /maestro). */
const MAESTRO_HOME_CODES = new Set(['1002026501'])

export async function loginAs(
  page: Page,
  opts: { code?: string; password?: string; home?: RegExp } = {},
) {
  const code = opts.code ?? '1002026100'
  const password = opts.password ?? 'Admin123!'
  const home =
    opts.home ??
    (MAESTRO_HOME_CODES.has(code) ? /\/maestro\/?$/ : /\/dashboard/)

  await page.goto('/login')
  await expect(page.getByTestId('login-form')).toHaveAttribute('data-ready', '1', {
    timeout: 15_000,
  })
  await page.getByTestId('login-code').fill(code)
  await page.getByTestId('login-password').fill(password)
  await page.getByTestId('login-submit').click()
  await expect(page).toHaveURL(home, { timeout: 15_000 })
}

export const test = base
export { expect }
