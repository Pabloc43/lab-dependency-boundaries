import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const diagramTitles = ['Mapa de dependencias', 'Ruta de validación del CI'];

async function loadDiagrams(page: Page) {
  for (const title of diagramTitles) {
    const iframe = page.locator(`iframe[title="${title}"]`);
    await iframe.scrollIntoViewIfNeeded();
    await expect(iframe.locator('..')).toHaveAttribute('data-viewer-state', 'ready');
    await expect(
      page
        .frameLocator(`iframe[title="${title}"]`)
        .locator('svg[data-quality-profile="showcase"]'),
    ).toHaveAttribute('role', 'group');
  }
}

test('creates an order and recovers from a simulated failure', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Crear pedido' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Pedido creado' }),
  ).toContainText('19,50');
  await page.getByLabel('Simular una falla al guardar').check();
  await page.getByRole('button', { name: 'Crear pedido' }).click();
  await expect(page.getByRole('alert')).toContainText('No se pudo guardar');
  await page.getByRole('button', { name: 'Crear pedido' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Pedido creado' }),
  ).toBeVisible();
});
test('rejects empty orders and invalid quantities', async ({ page }) => {
  await page.goto('./');
  for (const name of ['Cuaderno de taller', 'Lápiz de grafito', 'Regla de aluminio']) {
    await page.getByLabel(`Cantidad de ${name}`).fill('0');
  }
  await page.getByRole('button', { name: 'Crear pedido' }).click();
  await expect(page.getByRole('alert')).toContainText('al menos un producto');
  await page.getByLabel('Cantidad de Cuaderno de taller').fill('1.5');
  await page.getByRole('button', { name: 'Crear pedido' }).click();
  await expect(page.getByRole('alert')).toContainText('entero entre 1 y 20');
});
test('loads real reports, has no horizontal overflow and passes automated accessibility checks', async ({
  page,
}) => {
  await page.goto('./');
  await expect(page.getByText('INFRACCIÓN ESPERADA', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Aplicación válida' }).click();
  await expect(page.getByText('SIN INFRACCIONES', { exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await loadDiagrams(page);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    results.passes.some(({ nodes }) =>
      nodes.some(({ target }) => JSON.stringify(target).includes('iframe')),
    ),
  ).toBe(true);
  expect(
    results.violations.map(({ id, nodes }) => ({
      id,
      nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
    })),
  ).toEqual([]);
});
test('offers a working keyboard skip link', async ({ page }) => {
  await page.goto('./');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#contenido$/);
});

test('keeps both embedded diagrams interactive by pointer and keyboard', async ({
  page,
}) => {
  await page.goto('./');
  await loadDiagrams(page);
  for (const title of diagramTitles) {
    const frame = page.frameLocator(`iframe[title="${title}"]`);
    const nodes = frame.locator(
      'svg[data-quality-profile="showcase"] [data-node-id][role="button"]',
    );
    await nodes.nth(0).click();
    await expect(nodes.nth(0)).toHaveAttribute('aria-pressed', 'true');
    await nodes.nth(1).focus();
    await nodes.nth(1).press('Enter');
    await expect(nodes.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await nodes.nth(2).focus();
    await nodes.nth(2).press('Space');
    await expect(nodes.nth(2)).toHaveAttribute('aria-pressed', 'true');
    await frame
      .getByRole('button', { name: 'Close semantic passport', exact: true })
      .click();
    const theme = frame.locator('html');
    const initialTheme = await theme.getAttribute('data-theme');
    await frame.getByRole('button', { name: 'Toggle color theme', exact: true }).click();
    await expect(theme).not.toHaveAttribute('data-theme', initialTheme!);
    await frame.locator('button[data-view="reset"]').click();
    const zoom = frame.locator('button[data-view="reset"]');
    const initialZoom = await zoom.innerText();
    await frame.getByRole('button', { name: 'Zoom in', exact: true }).click();
    await expect(zoom).not.toHaveText(initialZoom);
    await zoom.click();
  }
});

test('allows Tab to enter and leave each embedded viewer', async ({ page }) => {
  await page.goto('./');
  await loadDiagrams(page);
  for (const [index, title] of diagramTitles.entries()) {
    const iframe = page.locator(`iframe[title="${title}"]`);
    const frame = page.frameLocator(`iframe[title="${title}"]`);
    const fullViewLink = iframe
      .locator('xpath=../preceding-sibling::div')
      .getByRole('link');
    await fullViewLink.focus();
    await page.keyboard.press('Tab');
    await expect(
      frame.getByRole('button', { name: 'Toggle color theme', exact: true }),
    ).toBeFocused();
    const lastTabStop = frame
      .locator(
        'a[href]:visible, button:visible:not([disabled]):not([tabindex="-1"]), input:visible, select:visible, [tabindex="0"]:visible',
      )
      .last();
    await lastTabStop.focus();
    await page.keyboard.press('Tab');
    if (index === 0) {
      await expect(
        page.getByRole('button', { name: 'Import incorrecto', exact: true }),
      ).toBeFocused();
    } else {
      await expect(
        page
          .locator('footer')
          .getByRole('link', { name: 'Pabloc43 / LABS', exact: true }),
      ).toBeFocused();
    }
  }
});

test('shows a useful fallback when a viewer response is not a valid diagram', async ({
  page,
}) => {
  await page.route('**/diagrams/architecture.html', (route) =>
    route.fulfill({
      status: 404,
      contentType: 'text/html',
      body: '<!doctype html><html><body>Missing diagram</body></html>',
    }),
  );
  await page.goto('./');
  await page.locator('#limites .diagram-card').scrollIntoViewIfNeeded();
  await expect(
    page.getByText('No fue posible preparar el visor integrado.', { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText('La interfaz depende de aplicación y dominio;', { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Abrir diagrama interactivo ↗', exact: true }),
  ).toBeVisible();
});
