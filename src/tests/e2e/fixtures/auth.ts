import { test as base, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/** Códigos de fixture con rol maestro (home = /maestro). */
const MAESTRO_HOME_CODES = new Set(['1002026501'])

/** Alumnos 1002026701–712 y responsables 1002026901–912 (un hijo cada uno) aterrizan en /alumno. */
function isPortalCode(code: string) {
  return /^10020267(0[1-9]|1[0-2])$/.test(code) || /^10020269(0[1-9]|1[0-2])$/.test(code)
}

function defaultHome(code: string) {
  if (MAESTRO_HOME_CODES.has(code)) return /\/maestro\/?$/
  if (isPortalCode(code)) return /\/alumno\/?$/
  return /\/dashboard/
}

export async function loginAs(
  page: Page,
  opts: { code?: string; password?: string; home?: RegExp } = {},
) {
  const code = opts.code ?? '1002026100'
  const password = opts.password ?? 'Admin123!'
  const home = opts.home ?? defaultHome(code)

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
