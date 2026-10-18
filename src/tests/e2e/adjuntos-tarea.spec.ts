import { test, expect, loginAs, entrarComoPadre, cerrarSesion } from './fixtures/auth'
import type { Locator, Page } from '@playwright/test'

// Maestro de prueba del fixture (Español 7-1): tiene tareas y permiso tareas:put.
const MAESTRO = '1002026501'
// data_test.sql: el alumno 701 (Ana Alvarez) y su padre 901 son de Español 7-1.
const ALUMNO = '1002026701'
const PADRE_ANA = '1002026901'

// Cámara falsa de Chromium: el permiso se concede solo y el video es un patrón de prueba.
test.use({
  permissions: ['camera'],
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] },
})

/** PNG de 1×1 para simular la foto/documento. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

/** PDF mínimo válido (el backend valida MIME + extensión, no el contenido). */
const PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 100 100]>>endobj\n' +
    'trailer<</Root 1 0 R>>\n%%EOF\n',
  'utf8',
)

/** Fecha de hoy en formato AAAA-MM-DD (para que la tarea caiga en el filtro «Esta semana»). */
function hoyISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Los ítems de la lista de adjuntos del modal de detalle (sin depender de clases CSS). */
function itemsAdjuntos(dialog: Locator): Locator {
  return dialog
    .getByTestId('tarea-archivos-lista')
    .locator('[data-testid^="tarea-adjunto-item-"]')
}

/**
 * Abre la primera tarea del maestro en el modal **Editar**. El detalle «Ver» es de
 * solo lectura, así que subir y borrar adjuntos se hace desde la edición.
 */
async function abrirEditarPrimeraTarea(page: Page): Promise<Locator> {
  await page.goto('/tareas')
  await expect(page.getByRole('columnheader', { name: 'Título' })).toBeVisible({ timeout: 15_000 })
  const row = page.locator('table.data-table tbody tr').first()
  await expect(row).toBeVisible()
  await row.click({ button: 'right' })
  await expect(page.getByTestId('tareas-staff-ctx-menu')).toBeVisible()
  await page.getByTestId('tareas-staff-ctx-editar').click()
  const dialog = page.getByTestId('tarea-create-modal')
  await expect(dialog).toBeVisible({ timeout: 15_000 })
  await expect(dialog.getByTestId('tarea-archivos')).toBeVisible({ timeout: 15_000 })
  return dialog
}

/** Deja la tarea sin adjuntos para que el test sea repetible. */
async function borrarAdjuntosExistentes(dialog: Locator) {
  const items = itemsAdjuntos(dialog)
  for (let i = 0; i < 10; i++) {
    const n = await items.count()
    if (n === 0) return
    await items.first().getByRole('button', { name: /^Eliminar / }).click()
    await dialog
      .getByTestId('confirm-eliminar-adjunto')
      .getByRole('button', { name: 'Eliminar' })
      .click()
    await expect(items).toHaveCount(n - 1, { timeout: 15_000 })
  }
}

test.describe('adjuntos de tarea (staff) @critical', () => {
  test('el maestro sube una imagen, sube un PDF y borra un adjunto', async ({ page }) => {
    await loginAs(page, { code: MAESTRO })
    const dialog = await abrirEditarPrimeraTarea(page)
    await borrarAdjuntosExistentes(dialog)

    // Imagen
    await dialog.getByTestId('tarea-adjunto-input-archivo').setInputFiles({
      name: 'foto-tarea.png',
      mimeType: 'image/png',
      buffer: PNG,
    })
    await expect(dialog.getByTestId('tarea-archivos-lista')).toContainText('foto-tarea.png', {
      timeout: 15_000,
    })

    // PDF
    await dialog.getByTestId('tarea-adjunto-input-archivo').setInputFiles({
      name: 'apunte-tarea.pdf',
      mimeType: 'application/pdf',
      buffer: PDF,
    })
    await expect(dialog.getByTestId('tarea-archivos-lista')).toContainText('apunte-tarea.pdf', {
      timeout: 15_000,
    })

    // Borrar el primero
    const items = itemsAdjuntos(dialog)
    await expect(items).toHaveCount(2)
    await items.first().getByRole('button', { name: /^Eliminar / }).click()
    await dialog
      .getByTestId('confirm-eliminar-adjunto')
      .getByRole('button', { name: 'Eliminar' })
      .click()
    await expect(items).toHaveCount(1, { timeout: 15_000 })
  })
})

test.describe('adjuntos de tarea: cámara', () => {
  test('tomar fotografía abre la cámara y sube la captura', async ({ page }) => {
    await loginAs(page, { code: MAESTRO })
    const dialog = await abrirEditarPrimeraTarea(page)
    await borrarAdjuntosExistentes(dialog)

    await dialog.getByTestId('tarea-adjunto-tomar-foto').click()

    const camara = dialog.getByTestId('tarea-adjunto-camara')
    await expect(camara).toBeVisible({ timeout: 10_000 })
    await expect
      .poll(() => camara.locator('video').evaluate((v: HTMLVideoElement) => v.videoWidth), {
        timeout: 10_000,
      })
      .toBeGreaterThan(0)

    await dialog.getByTestId('tarea-adjunto-capturar').click()
    await expect(camara).toHaveCount(0)
    await expect(dialog.getByTestId('tarea-archivos-lista')).toContainText(/foto-tarea-\d+\.jpg/, {
      timeout: 15_000,
    })
  })
})

test.describe('adjuntos de tarea: creación', () => {
  test('el maestro crea una tarea con un adjunto elegido', async ({ page }) => {
    await loginAs(page, { code: MAESTRO })
    await page.goto('/tareas')
    await expect(page.getByRole('columnheader', { name: 'Título' })).toBeVisible({
      timeout: 15_000,
    })

    await page.getByTestId('data-table-add-button').click()
    const modal = page.getByTestId('tarea-create-modal')
    await expect(modal).toBeVisible({ timeout: 15_000 })

    const titulo = `Tarea con adjunto ${Date.now()}`
    await modal.getByTestId('tarea-titulo-input').fill(titulo)
    await modal.getByTestId('tarea-fecha-entrega').fill(hoyISO())
    await modal.getByTestId('tarea-tipo-select').selectOption({ index: 1 })

    // Adjunto elegido antes de guardar la tarea.
    await modal.getByTestId('tarea-create-adjunto-input-archivo').setInputFiles({
      name: 'foto-crear.png',
      mimeType: 'image/png',
      buffer: PNG,
    })
    await expect(modal.getByTestId('tarea-create-archivos-lista')).toContainText('foto-crear.png')

    await page.getByTestId('tarea-guardar').click()
    await page.getByRole('button', { name: 'Confirmar' }).click()

    await expect(page.getByText('Tarea creada')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('1 archivo(s) cargado(s)')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('tarea-create-modal')).toHaveCount(0, { timeout: 15_000 })

    // La tarea quedó con su adjunto.
    await page.getByTestId('data-table-search').fill(titulo)
    const row = page.locator('table.data-table tbody tr').first()
    await expect(row).toContainText(titulo, { timeout: 15_000 })
    await row.click({ button: 'right' })
    await page.getByTestId('tareas-staff-ctx-ver').click()
    const dialog = page.getByTestId('tarea-ver-modal')
    await expect(dialog.getByTestId('tarea-archivos-lista')).toContainText('foto-crear.png', {
      timeout: 15_000,
    })
  })

  test('la creación avisa al alcanzar el máximo de archivos del periodo', async ({ page }) => {
    await loginAs(page, { code: MAESTRO })
    await page.goto('/tareas')
    await expect(page.getByRole('columnheader', { name: 'Título' })).toBeVisible({
      timeout: 15_000,
    })

    await page.getByTestId('data-table-add-button').click()
    const modal = page.getByTestId('tarea-create-modal')
    await expect(modal).toBeVisible({ timeout: 15_000 })

    // Tope por defecto del fixture: 3 archivos por tarea.
    const input = modal.getByTestId('tarea-create-adjunto-input-archivo')
    for (let i = 0; i < 3; i++) {
      await input.setInputFiles({
        name: `borrador-${i}.png`,
        mimeType: 'image/png',
        buffer: PNG,
      })
    }

    await expect(modal.getByTestId('tarea-create-archivos-tope')).toContainText(
      /máximo de \d+ archivos por tarea/,
      { timeout: 15_000 },
    )
    await expect(modal.getByTestId('tarea-create-adjunto-picker')).toHaveCount(0)
  })
})

test.describe('adjuntos de tarea: el portal los ve', () => {
  test('el maestro crea una tarea con imagen y PDF, y el alumno y el padre los ven', async ({
    page,
  }) => {
    // 1) El maestro crea la tarea con una imagen y un PDF adjuntos.
    await loginAs(page, { code: MAESTRO })
    await page.goto('/tareas')
    await expect(page.getByRole('columnheader', { name: 'Título' })).toBeVisible({
      timeout: 15_000,
    })

    await page.getByTestId('data-table-add-button').click()
    const modal = page.getByTestId('tarea-create-modal')
    await expect(modal).toBeVisible({ timeout: 15_000 })

    const titulo = `Tarea portal ${Date.now()}`
    await modal.getByTestId('tarea-titulo-input').fill(titulo)
    await modal.getByTestId('tarea-fecha-entrega').fill(hoyISO())
    await modal.getByTestId('tarea-tipo-select').selectOption({ index: 1 })

    const input = modal.getByTestId('tarea-create-adjunto-input-archivo')
    await input.setInputFiles({ name: 'foto-portal.png', mimeType: 'image/png', buffer: PNG })
    await input.setInputFiles({ name: 'apunte-portal.pdf', mimeType: 'application/pdf', buffer: PDF })
    const lista = modal.getByTestId('tarea-create-archivos-lista')
    await expect(lista).toContainText('foto-portal.png')
    await expect(lista).toContainText('apunte-portal.pdf')

    await page.getByTestId('tarea-guardar').click()
    await page.getByRole('button', { name: 'Confirmar' }).click()
    await expect(page.getByText('Tarea creada')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('2 archivo(s) cargado(s)')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('tarea-create-modal')).toHaveCount(0, { timeout: 15_000 })

    // 2) El alumno la ve en el portal con sus dos archivos.
    await cerrarSesion(page)
    await loginAs(page, { code: ALUMNO })
    const portal = (await (
      await page.request.get('/api/portal/tareas', { headers: { 'X-Active-Role': 'alumno' } })
    ).json()) as Array<{
      id: string
      titulo: string
      adjuntos?: Array<{ id: string; nombre_original: string }>
    }>
    const tarea = portal.find((t) => t.titulo === titulo)
    expect(tarea, 'el alumno debe ver la tarea recién creada').toBeTruthy()
    const adjuntos = tarea!.adjuntos ?? []
    expect(adjuntos.map((a) => a.nombre_original).sort()).toEqual([
      'apunte-portal.pdf',
      'foto-portal.png',
    ])
    const tareaId = tarea!.id
    const imagen = adjuntos.find((a) => a.nombre_original === 'foto-portal.png')!
    const pdf = adjuntos.find((a) => a.nombre_original === 'apunte-portal.pdf')!

    await page.getByTestId('alumno-tile-tareas').click()
    await expect(page.getByTestId('alumno-tareas')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId(`alumno-tarea-${tareaId}`).click()
    const modalAlumno = page.getByTestId('portal-tarea-ver-modal')
    const seccionAlumno = modalAlumno.getByTestId('portal-tarea-archivos-seccion')
    await expect(seccionAlumno).toContainText('Archivos (2)', { timeout: 15_000 })
    await expect(seccionAlumno).toContainText('foto-portal.png')
    await expect(seccionAlumno).toContainText('apunte-portal.pdf')

    // La imagen se amplía con zoom.
    await modalAlumno.getByTestId(`portal-adjunto-ver-${imagen.id}`).click()
    await modalAlumno.getByTestId(`portal-adjunto-vista-${imagen.id}`).click()
    const visor = page.getByTestId('visor-imagen')
    await expect(visor).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('visor-cerrar').click()
    await expect(visor).toHaveCount(0)

    // El PDF se previsualiza y se descarga.
    await modalAlumno.getByTestId(`portal-adjunto-ver-${pdf.id}`).click()
    await expect(modalAlumno.getByTestId(`portal-adjunto-vista-${pdf.id}`)).toBeVisible({
      timeout: 15_000,
    })
    const download = page.waitForEvent('download')
    await modalAlumno.getByTestId(`portal-adjunto-descargar-${pdf.id}`).click()
    expect((await download).suggestedFilename()).toBe('apunte-portal.pdf')

    // 3) El padre del alumno ve lo mismo en el portal del hijo.
    await cerrarSesion(page)
    await entrarComoPadre(page, PADRE_ANA)
    await page.getByTestId('padre-tile-tareas').click()
    await expect(page.getByTestId('padre-tareas')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId(`padre-tarea-${tareaId}`).click()
    const modalPadre = page.getByTestId('portal-tarea-ver-modal')
    const seccionPadre = modalPadre.getByTestId('portal-tarea-archivos-seccion')
    await expect(seccionPadre).toContainText('Archivos (2)', { timeout: 15_000 })
    await expect(seccionPadre).toContainText('foto-portal.png')
    await expect(seccionPadre).toContainText('apunte-portal.pdf')
  })
})
