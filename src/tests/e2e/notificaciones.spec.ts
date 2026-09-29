import { test, expect, loginAs } from './fixtures/auth'

const PEDRO = '1002026501'
const ALUMNO = '1002026701'
const ADMIN = '1002026100'
const RESPONSABLE = '1002026901'

test.describe('notificaciones @smoke', () => {
  test('maestro ve la campana y la lista filtrada por rol', async ({ page }) => {
    await loginAs(page, { code: PEDRO })
    const bell = page.getByTestId('notifications-bell')
    await expect(bell).toBeVisible({ timeout: 15_000 })
    await bell.click()

    const list = page.getByTestId('notifications-list')
    await expect(list).toBeVisible({ timeout: 10_000 })
    await expect(list).toContainText('Entrega de planes de estudio')
    await expect(list).toContainText('Aviso importante')
    await expect(list).not.toContainText('Semana de exámenes')
    await expect(list).not.toContainText('Aviso vencido')
    await expect(
      page.getByTestId('notification-row').filter({ hasText: 'Aviso importante' }),
    ).toContainText('Importante')
  })

  test('abrir una notificacion muestra su contenido y cerrar regresa a la lista', async ({
    page,
  }) => {
    await loginAs(page, { code: PEDRO })
    await page.getByTestId('notifications-bell').click()
    await page
      .getByTestId('notification-row')
      .filter({ hasText: 'Entrega de planes de estudio' })
      .click()

    const detail = page.getByTestId('notification-detail')
    await expect(detail).toBeVisible()
    await expect(detail).toContainText('Recuerden subir el plan de estudio')
    await expect(page.getByRole('dialog', { name: 'Entrega de planes de estudio' })).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(detail).toHaveCount(0)
    await expect(page.getByTestId('notifications-list')).toBeVisible()
  })

  test('abrir una no leida la marca como leida', async ({ page }) => {
    await loginAs(page, { code: PEDRO })
    await page.getByTestId('notifications-bell').click()
    await expect(page.getByTestId('notifications-list')).toBeVisible({ timeout: 10_000 })

    const unreadRows = page.locator('[data-testid="notification-row"].notif-row--unread')
    const before = await unreadRows.count()
    test.skip(before === 0, 'Pedro ya leyó todas las notificaciones; reaplicar data_test.sql')

    const row = unreadRows.first()
    const titulo = (await row.locator('.notif-row__title').textContent())?.trim() ?? ''
    await row.click()
    await expect(page.getByTestId('notification-detail')).toBeVisible()
    await page.getByRole('dialog', { name: titulo }).getByRole('button', { name: 'Cerrar' }).click()
    await expect(page.getByTestId('notification-detail')).toHaveCount(0)

    const same = page.getByTestId('notification-row').filter({ hasText: titulo }).first()
    await expect(same).not.toHaveClass(/notif-row--unread/)
    await expect(unreadRows).toHaveCount(before - 1)

    if (before - 1 === 0) {
      await expect(page.getByTestId('notifications-unread')).toHaveCount(0)
    } else {
      await expect(page.getByTestId('notifications-unread')).toHaveText(String(before - 1))
    }
  })

  test('alumno ve avisos de alumno y no los de maestros', async ({ page }) => {
    await loginAs(page, { code: ALUMNO })
    await page.getByTestId('notifications-bell').click()
    const list = page.getByTestId('notifications-list')
    await expect(list).toBeVisible({ timeout: 10_000 })
    await expect(list).toContainText('Semana de exámenes')
    await expect(list).not.toContainText('Entrega de planes de estudio')
    await expect(list).not.toContainText('Reunión de docentes')
  })

  test('admin tambien tiene campana', async ({ page }) => {
    await loginAs(page, { code: ADMIN })
    await page.getByTestId('notifications-bell').click()
    await expect(page.getByTestId('notifications-list')).toContainText('Revisión de matrícula', {
      timeout: 10_000,
    })
  })

  test('el banner activo aparece en grande en el hub del maestro', async ({ page }) => {
    await loginAs(page, { code: PEDRO })
    const banner = page.getByTestId('aviso-banner')
    await expect(banner).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('aviso-banner-titulo')).toHaveText('Aviso importante')
    await expect(banner).toContainText('Las clases del lunes se suspenden')
  })

  for (const [rol, code] of [
    ['alumno', ALUMNO],
    ['responsable', RESPONSABLE],
    ['admin', ADMIN],
  ] as const) {
    test(`el banner llega al inicio del ${rol}`, async ({ page }) => {
      await loginAs(page, { code })
      await expect(page.getByTestId('aviso-banner')).toBeVisible({ timeout: 15_000 })
      await expect(page.getByTestId('aviso-banner')).toHaveCount(1)
      await expect(page.getByTestId('aviso-banner-titulo')).toHaveText('Aviso importante')
    })
  }

  test('admin puede iniciar quitar banner y cancelar sin afectarlo', async ({ page }) => {
    await loginAs(page, { code: ADMIN })
    await page.goto('/notificaciones-admin')
    const row = page.getByRole('row').filter({ hasText: 'Aviso importante' })
    await expect(row).toBeVisible({ timeout: 15_000 })
    await row.click({ button: 'right' })
    await page.getByTestId('notif-quitar-banner').click()
    const dialog = page.getByRole('dialog', { name: 'Quitar banner' })
    await expect(dialog).toContainText('Aviso importante')
    await dialog.getByRole('button', { name: /cancelar/i }).click()
    await expect(dialog).toHaveCount(0)

    await page.getByRole('row').filter({ hasText: 'Revisión de matrícula' }).click({ button: 'right' })
    await expect(page.getByTestId('notif-quitar-banner')).toHaveCount(0)
  })

  test('el modal se encoge antes de desaparecer al cerrar', async ({ page }) => {
    await loginAs(page, { code: PEDRO })
    await page.getByTestId('notifications-bell').click()
    await expect(page.getByTestId('notifications-list')).toBeVisible({ timeout: 10_000 })

    await page.getByRole('dialog').getByRole('button', { name: 'Cerrar' }).click()
    await expect(page.locator('.modal-backdrop--closing')).toHaveCount(1)
    await expect(page.locator('.modal-backdrop')).toHaveCount(0)
  })
})
