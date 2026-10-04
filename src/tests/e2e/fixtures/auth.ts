import { test as base, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/** Códigos de fixture con rol maestro (home = /maestro). */
const MAESTRO_HOME_CODES = new Set(['1002026501'])

/** Alumnos 1002026701–712 aterrizan en /alumno. */
function isAlumnoCode(code: string) {
  return /^10020267(0[1-9]|1[0-2])$/.test(code)
}

/** Responsables 1002026901–913 aterrizan en /responsable (tarjetas de hijos); 913 tiene a Ana y Bruno. */
function isResponsableCode(code: string) {
  return /^10020269(0[1-9]|1[0-3])$/.test(code)
}

function defaultHome(code: string) {
  if (MAESTRO_HOME_CODES.has(code)) return /\/maestro\/?$/
  if (isAlumnoCode(code)) return /\/alumno\/?$/
  if (isResponsableCode(code)) return /\/responsable\/?$/
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

/** Entra como responsable y abre el inicio (botones grandes) de su primer hijo. */
export async function entrarComoPadre(page: Page, code: string) {
  await loginAs(page, { code })
  const card = page.getByTestId('responsable-hijos').locator('.hijo-card').first()
  await expect(card).toBeVisible({ timeout: 15_000 })
  await card.click()
  await expect(page.getByTestId('padre-tiles')).toBeVisible({ timeout: 15_000 })
}

export const test = base
export { expect }
