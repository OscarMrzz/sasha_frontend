import { test, expect, loginAs } from './fixtures/auth'
import type { Browser, Page } from '@playwright/test'

// DEC-022 y DEC-023. El padre N tiene a cargo al alumno N (data_test.sql). Cada prueba usa un alumno distinto
// para que los avisos de un día no se crucen: Luis 712 (falta), Karen 711 (tarde), Jorge 710 (excusa).
// El padre tiene la sesión abierta antes de que se guarde: el aviso debe llegarle por SSE, sin recargar
// (la campana solo sondea cada 60 s).
const PEDRO = '1002026501'
const CONSEJERIA = '1002026602'
const SSE_TIMEOUT = 20_000

test.describe.configure({ mode: 'serial' })

function hoyISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function sesion(browser: Browser, code: string) {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await loginAs(page, { code })
  await expect(page.getByTestId('notifications-bell')).toBeVisible({ timeout: 15_000 })
  return page
}

async function abrirGrilla(page: Page) {
  await page.goto('/asistencia')
  await expect(page.getByTestId('asistencia-inline')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('[data-testid="asistencia-semana-table"] tbody tr')).toHaveCount(12, {
    timeout: 15_000,
  })
}

async function marcar(page: Page, alumno: string, fecha: string, letra: string) {
  const celda = page.getByTestId(`asistencia-celda-${alumno}-${fecha}`)
  for (let i = 0; i < 6 && (await celda.getAttribute('data-letra')) !== letra; i++) {
    await celda.click()
  }
  await expect(celda).toHaveAttribute('data-letra', letra)
}

async function guardar(page: Page) {
  await page.getByTestId('asistencia-guardar').click()
  await page
    .getByRole('dialog', { name: 'Guardar asistencia' })
    .getByRole('button', { name: 'Guardar', exact: true })
    .click()
  await expect(page.getByText('Asistencia guardada').last()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('asistencia-guardar')).toBeDisabled()
}

/** Abre la lista de la campana, devuelve las filas con ese título y la cierra con `cerrar()`. */
async function avisosDelPadre(padre: Page, titulo: string) {
  await padre.getByTestId('notifications-bell').click()
  const lista = padre.getByRole('dialog', { name: /Notificaciones/ })
  await expect(lista).toBeVisible()
  return {
    filas: lista.getByTestId('notification-row').filter({ hasText: titulo }),
    cerrar: () => lista.getByRole('button', { name: 'Cerrar' }).click(),
  }
}

test.describe('avisos de asistencia a los padres', () => {
  test('falta sin justificación avisa al padre al momento; la E la reemplaza por la justificada', async ({ page, browser }) => {
    const padre = await sesion(browser, '1002026912')
    await loginAs(page, { code: PEDRO })
    await abrirGrilla(page)

    await marcar(page, '1002026712', hoyISO(), 'F')
    await guardar(page)

    await expect(padre.getByText('Falta sin justificación').first()).toBeVisible({ timeout: SSE_TIMEOUT })
    let avisos = await avisosDelPadre(padre, 'Falta sin justificación')
    await expect(avisos.filas).toHaveCount(1)
    await expect(avisos.filas.getByTestId('notification-nivel')).toHaveAttribute('data-nivel', 'grave')
    await expect(avisos.filas).toContainText('faltó hoy a clase sin justificación')
    await avisos.cerrar()

    // Guardar otra vez la F no repite el aviso del día.
    await marcar(page, '1002026712', hoyISO(), 'A')
    await guardar(page)
    await marcar(page, '1002026712', hoyISO(), 'F')
    await guardar(page)

    // La E reemplaza a la injustificada.
    await marcar(page, '1002026712', hoyISO(), 'E')
    await guardar(page)
    await expect(padre.getByText('Falta justificada').first()).toBeVisible({ timeout: SSE_TIMEOUT })
    avisos = await avisosDelPadre(padre, 'Falta justificada')
    await expect(avisos.filas).toHaveCount(1)
    await expect(avisos.filas.getByTestId('notification-nivel')).toHaveAttribute('data-nivel', 'info_ok')
    await expect(avisos.filas).toContainText('no repercutirá de manera negativa')
    await expect(
      padre.getByRole('dialog', { name: /Notificaciones/ }).getByTestId('notification-row').filter({ hasText: 'Falta sin justificación' }),
    ).toHaveCount(0)
    await avisos.cerrar()
    await padre.context().close()
  })

  test('llegada tarde avisa al padre una sola vez por clase y día', async ({ page, browser }) => {
    const padre = await sesion(browser, '1002026911')
    await loginAs(page, { code: PEDRO })
    await abrirGrilla(page)

    await marcar(page, '1002026711', hoyISO(), 'T')
    await guardar(page)
    await expect(padre.getByText('Llegada tarde').first()).toBeVisible({ timeout: SSE_TIMEOUT })

    // Corregir y volver a marcar tarde en la misma clase no manda otro aviso.
    await marcar(page, '1002026711', hoyISO(), 'A')
    await guardar(page)
    await marcar(page, '1002026711', hoyISO(), 'T')
    await guardar(page)

    await padre.reload()
    const avisos = await avisosDelPadre(padre, 'Llegada tarde')
    await expect(avisos.filas).toHaveCount(1)
    await expect(avisos.filas.getByTestId('notification-nivel')).toHaveAttribute('data-nivel', 'advertencia')
    await expect(avisos.filas).toContainText('llegó tarde hoy a la clase de Español')
    await avisos.cerrar()
    await padre.context().close()
  })

  test('excusa registrada: el padre recibe el aviso y las clases quedan con candado para el maestro', async ({ page, browser }) => {
    const padre = await sesion(browser, '1002026910')

    // Consejería registra una excusa de Jorge del lunes 28/09 al viernes 02/10/2026.
    await loginAs(page, { code: CONSEJERIA })
    await page.goto('/excusas')
    await expect(page.getByTestId('excusas-page')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('data-table-add-button').click()
    await page.getByTestId('excusa-alumno-input').fill('1002026710')
    await page.locator('.combobox__option', { hasText: '1002026710' }).first().click()
    await page.getByTestId('excusa-tipo-input').fill('Enfermedad propia')
    await page.locator('.combobox__option', { hasText: 'Enfermedad propia' }).first().click()
    await page.getByTestId('excusa-desde').fill('2026-09-28')
    await page.getByTestId('excusa-hasta').fill('2026-10-02')
    await page.getByTestId('excusa-guardar').click()
    await page
      .getByRole('dialog', { name: 'Guardar excusa' })
      .getByRole('button', { name: 'Guardar', exact: true })
      .click()
    await expect(page.getByText(/Excusa guardada: \d+ clases/)).toBeVisible({ timeout: 15_000 })

    await expect(padre.getByText('Falta justificada').first()).toBeVisible({ timeout: SSE_TIMEOUT })
    const avisos = await avisosDelPadre(padre, 'Falta justificada')
    await expect(avisos.filas).toHaveCount(1)
    await expect(avisos.filas.getByTestId('notification-nivel')).toHaveAttribute('data-nivel', 'info_ok')
    await expect(avisos.filas).toContainText('Enfermedad propia')
    await expect(avisos.filas).toContainText('del 28/09/2026 al 02/10/2026')
    await avisos.cerrar()
    await padre.context().close()

    // Pedro ve la clase del martes con candado y no la puede cambiar.
    await page.context().clearCookies()
    await loginAs(page, { code: PEDRO })
    await abrirGrilla(page)
    await page.getByTestId('asistencia-fecha-ref').fill('2026-09-29')
    const celda = page.getByTestId('asistencia-celda-1002026710-2026-09-29')
    await expect(celda).toHaveAttribute('data-bloqueada', 'true', { timeout: 15_000 })
    await expect(celda).toHaveAttribute('data-letra', 'E')
    await expect(celda).toHaveAttribute('title', 'Excusa registrada: Enfermedad propia')
    await celda.click()
    await expect(page.getByText(/tiene una excusa registrada/)).toBeVisible()
    await expect(celda).toHaveAttribute('data-letra', 'E')
    await expect(page.getByTestId('asistencia-guardar')).toBeDisabled()
  })
})
