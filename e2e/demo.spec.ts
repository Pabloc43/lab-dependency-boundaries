import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
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
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
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
