import type { Page } from '@playwright/test'
import { test, expect, loginAs } from './fixtures/auth'

/**
 * Completa los campos mínimos del paso Alumno si el fixture no los trae
 * (los perfiles de prueba no siempre tienen sexo/fecha de nacimiento).
 */
async function completarPasoAlumno(page: Page) {
  const nombre = page.getByTestId('matricula-primer-nombre')
  if ((await nombre.inputValue()).trim() === '') await nombre.fill('Alumno')
  const apellido = page.getByTestId('matricula-primer-apellido')
  if ((await apellido.inputValue()).trim() === '') await apellido.fill('Prueba')
  const sexo = page.getByTestId('matricula-sexo')
  if ((await sexo.inputValue()).trim() === '') {
    await sexo.click()
    await page.getByRole('button', { name: 'Femenino' }).click()
  }
  const fecha = page.getByTestId('matricula-fecha-nacimiento')
  if ((await fecha.inputValue()).trim() === '') await fecha.fill('2015-03-10')
}

/** Abre el wizard en modo edición desde el clic derecho de la primera fila. */
async function abrirEdicion(page: Page) {
  await loginAs(page)
  await page.goto('/matricula')
  await expect(page.getByRole('heading', { name: 'Matrícula' })).toBeVisible({
    timeout: 15_000,
  })
  const row = page.locator('table.data-table tbody tr').first()
  await expect(row).toBeVisible()
  await row.click({ button: 'right' })
  await page.getByTestId('ctx-editar').click()
  await expect(
    page.getByRole('heading', { name: 'Editar matrícula' }),
  ).toBeVisible({
    timeout: 15_000,
  })
  // Señal positiva de fin de precarga: el primer nombre ya tiene valor (la
  // matrícula cargó). Esperar a la ausencia de «Cargando…» pasaría antes de
  // empezar, por eso se comprueba el dato cargado.
  await expect(page.getByTestId('matricula-primer-nombre')).not.toHaveValue('', {
    timeout: 20_000,
  })
  await completarPasoAlumno(page)
}

/** Recorre alumno → historial → académico → responsables. */
async function irAResponsables(page: Page) {
  await page.getByTestId('matricula-wizard-next').click()
  await page.getByTestId('matricula-wizard-next').click()
  await page.getByTestId('matricula-wizard-next').click()
  await expect(page.getByTestId('matricula-responsable-0')).toBeVisible({
    timeout: 10_000,
  })
}

/** Ir de responsables a pago (responsables → foto → pago). */
async function deResponsablesAPago(page: Page) {
  await page.getByTestId('matricula-wizard-next').click()
  await page.getByTestId('matricula-wizard-next').click()
  await expect(
    page.locator('.wizard-pane__title').filter({ hasText: 'Pago' }),
  ).toBeVisible({ timeout: 10_000 })
}

/** Los toasts de Sonner tapan el footer; se dejan desaparecer antes de seguir. */
async function esperarSinToasts(page: Page) {
  await page.mouse.move(0, 0)
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, {
    timeout: 15_000,
  })
}

/** Confirmar el guardado en modo edición. */
async function guardarCambios(page: Page) {
  await page.getByTestId('matricula-wizard-finish').click()
  await page.getByRole('button', { name: 'Guardar cambios' }).last().click()
  await expect(
    page.getByRole('heading', { name: 'Editar matrícula' }),
  ).toHaveCount(0, {
    timeout: 15_000,
  })
}

/** Elige en un Combobox la primera opción cuyo texto difiera del valor actual. */
async function elegirOpcionDistinta(page: Page, testId: string) {
  const combo = page.getByTestId(testId)
  const actual = (await combo.inputValue()).trim()
  await combo.click()
  const options = page.locator('.combobox__option')
  const count = await options.count()
  for (let i = 0; i < count; i++) {
    const texto = (await options.nth(i).innerText()).trim()
    if (texto && texto !== actual) {
      await options.nth(i).click()
      return true
    }
  }
  return false
}

function becaActiva(page: Page) {
  return page.locator(
    '[data-testid^="beca-op-"][class*="wizard-choice__btn--on"]',
  )
}

test.describe('matricula edicion @critical', () => {
  test('precarga la matrícula al abrir en modo edición', async ({ page }) => {
    await abrirEdicion(page)

    // Paso 1 · Alumno precargado.
    await expect(page.getByTestId('matricula-primer-nombre')).not.toHaveValue(
      '',
    )
    await expect(page.getByTestId('matricula-primer-apellido')).not.toHaveValue(
      '',
    )

    // Paso 3 · Académico precargado: periodo (solo lectura), grado y sección concretos.
    await page.getByTestId('matricula-wizard-next').click()
    await page.getByTestId('matricula-wizard-next').click()
    await expect(page.getByText('Datos académicos')).toBeVisible({
      timeout: 10_000,
    })

    const periodo = page.getByTestId('matricula-periodo')
    await expect(periodo).toBeDisabled()
    await expect(periodo).not.toHaveValue('')
    await expect(page.getByTestId('matricula-grado')).not.toHaveValue('')
    await expect(page.getByTestId('matricula-seccion')).not.toHaveValue('')
    await expect(
      page.getByTestId('matricula-restaurar-academico'),
    ).toBeVisible()
  })

  test('Restaurar por ventana: académico y pago', async ({ page }) => {
    await abrirEdicion(page)
    await page.getByTestId('matricula-wizard-next').click()
    await page.getByTestId('matricula-wizard-next').click()

    // Restaurar Académico devuelve el grado inicial.
    const grado = page.getByTestId('matricula-grado')
    const gradoInicial = await grado.inputValue()
    expect(await elegirOpcionDistinta(page, 'matricula-grado')).toBe(true)
    await expect(grado).not.toHaveValue(gradoInicial)
    await page.getByTestId('matricula-restaurar-academico').click()
    await expect(grado).toHaveValue(gradoInicial)

    // Ir a Pago y restaurar la beca inicial.
    await page.getByTestId('matricula-wizard-next').click() // responsables
    await deResponsablesAPago(page)
    const inicial = await becaActiva(page).getAttribute('data-testid')
    expect(inicial).toBeTruthy()
    if (inicial === 'beca-op-normal') {
      await page.getByTestId('beca-op-media').click()
    } else {
      await page.getByTestId('beca-op-normal').click()
    }
    await expect(becaActiva(page)).not.toHaveAttribute(
      'data-testid',
      inicial ?? '',
    )
    await page.getByTestId('matricula-restaurar-pago').click()
    await expect(becaActiva(page)).toHaveAttribute('data-testid', inicial ?? '')
  })

  test('edita el teléfono de un responsable existente', async ({ page }) => {
    const personaPuts: string[] = []
    page.on('request', (req) => {
      if (req.method() === 'PUT' && req.url().includes('/personas/')) {
        personaPuts.push(req.url())
      }
    })

    await abrirEdicion(page)
    await irAResponsables(page)

    const telefono = page.getByTestId('matricula-resp-telefono')
    await expect(telefono).toBeVisible()
    await telefono.fill('88721992')

    await deResponsablesAPago(page)
    await page.getByTestId('matricula-wizard-next').click() // confirmar
    await expect(page.getByText('Revisión final')).toBeVisible({
      timeout: 10_000,
    })
    await guardarCambios(page)

    // Al menos el alumno y el responsable existente se actualizan.
    expect(personaPuts.length).toBeGreaterThanOrEqual(2)
  })

  test('reemplaza el responsable por otro código', async ({ page }) => {
    const links: string[] = []
    const unlinks: string[] = []
    page.on('request', (req) => {
      if (
        req.method() === 'POST' &&
        /\/matricula\/[^/]+\/responsables$/.test(req.url())
      ) {
        links.push(req.url())
      }
      if (
        req.method() === 'DELETE' &&
        req.url().includes('/responsables/')
      ) {
        unlinks.push(req.url())
      }
    })

    await abrirEdicion(page)
    await irAResponsables(page)

    const panel = page.getByTestId('matricula-responsable-0')
    const codeInput = page.getByTestId('matricula-resp-code')
    const actual = (await codeInput.inputValue()).trim()
    const candidatos = ['1002026901', '1002026902', '1702026101']
    const nuevo = candidatos.find((c) => c !== actual) ?? '1002026901'

    await codeInput.fill(nuevo)
    await panel.getByRole('button', { name: 'Buscar' }).click()
    await expect(panel.getByText('Encontrado')).toBeVisible({ timeout: 10_000 })
    await expect(codeInput).toHaveValue(nuevo)
    await esperarSinToasts(page)

    await deResponsablesAPago(page)
    await page.getByTestId('matricula-wizard-next').click()
    await expect(page.getByText('Revisión final')).toBeVisible({
      timeout: 10_000,
    })
    await guardarCambios(page)

    expect(links.length).toBeGreaterThanOrEqual(1)
    // El responsable anterior se desvincula (DELETE) al guardar.
    expect(unlinks.length).toBeGreaterThanOrEqual(1)
  })

  test('desvincula un responsable al quitarlo', async ({ page }) => {
    const deletes: string[] = []
    page.on('request', (req) => {
      if (req.method() === 'DELETE' && req.url().includes('/responsables/')) {
        deletes.push(req.url())
      }
    })

    await abrirEdicion(page)
    await irAResponsables(page)

    // m4: en edición no se puede quedar con cero responsables. Se añade uno
    // nuevo antes de quitar el existente para poder desvincularlo.
    await page.getByTestId('matricula-add-responsable').click()
    const nuevoPanel = page
      .locator('[data-testid^="matricula-responsable-"]')
      .last()
    await nuevoPanel.getByRole('button', { name: 'No, es nuevo' }).click()
    await nuevoPanel
      .locator('.field', { hasText: 'Primer nombre' })
      .locator('input')
      .fill('Nuevo')
    await nuevoPanel
      .locator('.field', { hasText: 'Primer apellido' })
      .locator('input')
      .fill('Responsable')
    const parentesco = nuevoPanel
      .locator('.field', { hasText: 'Parentesco' })
      .locator('input')
    await parentesco.fill('Tío')
    await parentesco.press('Enter')
    await nuevoPanel.locator('input[type="checkbox"]').check()
    await esperarSinToasts(page)

    // Quitar el responsable existente (persistido) → se desvincula al guardar.
    await page
      .getByTestId('matricula-responsable-0')
      .getByRole('button', { name: 'Quitar' })
      .click()

    await deResponsablesAPago(page)
    await page.getByTestId('matricula-wizard-next').click()
    await expect(page.getByText('Revisión final')).toBeVisible({
      timeout: 10_000,
    })
    await guardarCambios(page)

    expect(deletes.length).toBeGreaterThanOrEqual(1)
  })

  test('cambia la beca y el grado y se reflejan en el resumen', async ({
    page,
  }) => {
    const matPuts: string[] = []
    page.on('request', (req) => {
      if (req.method() === 'PUT' && /\/matricula\/[^/]+$/.test(req.url())) {
        matPuts.push(req.postData() ?? '')
      }
    })

    await abrirEdicion(page)
    await page.getByTestId('matricula-wizard-next').click()
    await page.getByTestId('matricula-wizard-next').click()

    // Cambio de grado (requiere volver a elegir la sección del nuevo grado).
    expect(await elegirOpcionDistinta(page, 'matricula-grado')).toBe(true)
    const haySeccion = await elegirOpcionDistinta(page, 'matricula-seccion')
    expect(haySeccion).toBe(true)

    await page.getByTestId('matricula-wizard-next').click() // responsables
    await deResponsablesAPago(page)
    await page.getByTestId('beca-op-media').click()
    await page.getByTestId('matricula-wizard-next').click() // confirmar

    await expect(page.getByText('Revisión final')).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByTestId('beca-resumen')).toContainText('Media beca')
    await guardarCambios(page)

    expect(matPuts.length).toBeGreaterThanOrEqual(1)
    expect(matPuts[0]).toContain('"tipo_beca":"media"')
  })
})
