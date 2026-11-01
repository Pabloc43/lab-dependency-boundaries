import { expect, test, type Page } from '@playwright/test';
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import type {} from './fixture';

let harnessScript: string;
const order = {
  id: 'one',
  lines: [
    { productId: 'notebook', name: 'Notebook', quantity: 1, unitPriceCents: 100 },
    { productId: 'pencil', name: 'Pencil', quantity: 2, unitPriceCents: 50 },
  ],
  totalCents: 200,
};

async function view(page: Page) {
  return JSON.parse((await page.locator('output').textContent())!);
}

async function waitForAttempt(page: Page, count: number) {
  await expect
    .poll(() => page.evaluate(() => window.orderDemoHarness.counts().attempts))
    .toBe(count);
}

test.beforeAll(async () => {
  const result = await build({
    configFile: false,
    logLevel: 'silent',
    plugins: [react()],
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    build: {
      write: false,
      minify: false,
      lib: {
        entry: fileURLToPath(new URL('./fixture.tsx', import.meta.url)),
        formats: ['iife'],
        name: 'OrderDemoHarness',
      },
    },
  });
  const outputs = Array.isArray(result) ? result : [result];
  harnessScript = outputs
    .flatMap((output) => ('output' in output ? output.output : []))
    .filter((output) => output.type === 'chunk')
    .map((output) => output.code)
    .join('\n');
  expect(harnessScript).toContain('orderDemoHarness');
});

test.beforeEach(async ({ page }) => {
  await page.route('**/order-demo-harness.js', (route) =>
    route.fulfill({ contentType: 'text/javascript; charset=utf-8', body: harnessScript }),
  );
  await page.route('**/order-demo-harness', (route) =>
    route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><html><body><div id="root"></div><script src="/order-demo-harness.js"></script></body></html>',
    }),
  );
  await page.goto('/order-demo-harness');
  await expect(page.locator('output')).toContainText('"pending":false');
});

test('completes a deferred submission and dismisses only its successful result', async ({
  page,
}) => {
  await page.evaluate(() => window.orderDemoHarness.submit());
  await waitForAttempt(page, 1);
  expect(await view(page)).toMatchObject({ pending: true, order: null, error: '' });
  await page.evaluate(() => window.orderDemoHarness.dismiss());
  expect((await view(page)).pending).toBe(true);
  await page.evaluate((value) => window.orderDemoHarness.resolve(0, value), order);
  await expect.poll(async () => (await view(page)).order).toEqual(order);
  expect(await view(page)).toMatchObject({ pending: false, error: '' });
  await page.evaluate(() => window.orderDemoHarness.dismiss());
  await expect.poll(async () => (await view(page)).order).toBeNull();
});

test('blocks two submissions in the same tick and unlocks the next attempt', async ({
  page,
}) => {
  await page.evaluate(() => window.orderDemoHarness.doubleSubmit());
  await waitForAttempt(page, 1);
  await page.evaluate((value) => window.orderDemoHarness.resolve(0, value), order);
  await expect.poll(async () => (await view(page)).pending).toBe(false);
  await page.evaluate(() => window.orderDemoHarness.submit());
  await waitForAttempt(page, 2);
  expect(await view(page)).toMatchObject({ pending: true, order: null, error: '' });
});

test('preserves editable draft strings while the submitted lines remain a snapshot', async ({
  page,
}) => {
  await page.evaluate(() => window.orderDemoHarness.submit());
  await waitForAttempt(page, 1);
  await page.evaluate(() => window.orderDemoHarness.changeQuantity('notebook', ''));
  await expect.poll(async () => (await view(page)).quantities.notebook).toBe('');
  expect(await page.evaluate(() => window.orderDemoHarness.lines(0))).toEqual([
    { productId: 'notebook', quantity: 1 },
    { productId: 'pencil', quantity: 2 },
  ]);
  await page.evaluate((value) => window.orderDemoHarness.resolve(0, value), order);
  await expect.poll(async () => (await view(page)).pending).toBe(false);
  expect((await view(page)).quantities.notebook).toBe('');
  await page.evaluate(() => window.orderDemoHarness.submit());
  await waitForAttempt(page, 2);
  expect(await page.evaluate(() => window.orderDemoHarness.lines(1))).toEqual([
    { productId: 'notebook', quantity: 0 },
    { productId: 'pencil', quantity: 2 },
  ]);
});

test('preserves validation errors and dismissal cannot erase them', async ({ page }) => {
  await page.evaluate(() => window.orderDemoHarness.submit());
  await waitForAttempt(page, 1);
  await page.evaluate(() =>
    window.orderDemoHarness.reject(0, 'validation', 'Cantidad inválida'),
  );
  await expect.poll(async () => (await view(page)).error).toBe('Cantidad inválida');
  await page.evaluate(() => window.orderDemoHarness.dismiss());
  expect(await view(page)).toMatchObject({
    pending: false,
    order: null,
    error: 'Cantidad inválida',
  });
});

test('uses a useful fallback for empty repository failures and recovers', async ({
  page,
}) => {
  await page.evaluate(() => window.orderDemoHarness.submit());
  await waitForAttempt(page, 1);
  await page.evaluate(() => window.orderDemoHarness.reject(0, 'repository', '   '));
  await expect
    .poll(async () => (await view(page)).error)
    .toBe('No se pudo guardar el pedido. Intenta nuevamente.');
  await page.evaluate(() => window.orderDemoHarness.submit());
  await waitForAttempt(page, 2);
  expect(await view(page)).toMatchObject({ pending: true, order: null, error: '' });
  await page.evaluate((value) => window.orderDemoHarness.resolve(1, value), order);
  await expect.poll(async () => (await view(page)).order).toEqual(order);
});

test('handles a synchronous simulation failure and resets the one-attempt flag', async ({
  page,
}) => {
  await page.evaluate(() => {
    window.orderDemoHarness.setFailure(true);
    window.orderDemoHarness.simulationThrows(true);
  });
  await expect.poll(async () => (await view(page)).failure).toBe(true);
  await page.evaluate(() => window.orderDemoHarness.submit());
  await expect
    .poll(async () => (await view(page)).error)
    .toBe('No se pudo guardar el pedido. Simulation setup failed');
  expect(await view(page)).toMatchObject({ pending: false, failure: false, order: null });
  expect(await page.evaluate(() => window.orderDemoHarness.counts().attempts)).toBe(0);
  await page.evaluate(() => window.orderDemoHarness.submit());
  await waitForAttempt(page, 1);
  expect(
    await page.evaluate(() => window.orderDemoHarness.counts().simulationCalls),
  ).toBe(1);
});

test('resets a selected simulation after a failed validation attempt', async ({
  page,
}) => {
  await page.evaluate(() => {
    window.orderDemoHarness.setFailure(true);
    window.orderDemoHarness.changeQuantity('notebook', '');
  });
  await expect.poll(async () => (await view(page)).failure).toBe(true);
  await page.evaluate(() => window.orderDemoHarness.submit());
  await waitForAttempt(page, 1);
  await page.evaluate(() =>
    window.orderDemoHarness.reject(0, 'validation', 'Cantidad inválida'),
  );
  await expect.poll(async () => (await view(page)).failure).toBe(false);
  await page.evaluate(() => window.orderDemoHarness.submit());
  await waitForAttempt(page, 2);
  expect(
    await page.evaluate(() => window.orderDemoHarness.counts().simulationCalls),
  ).toBe(1);
});

test('does not commit a successful completion or submit again after unmount', async ({
  page,
}) => {
  await page.evaluate(() => window.orderDemoHarness.submit());
  await waitForAttempt(page, 1);
  await page.evaluate(() => window.orderDemoHarness.unmount());
  const renders = await page.evaluate(() => window.orderDemoHarness.counts().renders);
  await page.evaluate((value) => {
    window.orderDemoHarness.resolve(0, value);
    window.orderDemoHarness.submit();
  }, order);
  expect(await page.evaluate(() => window.orderDemoHarness.counts())).toMatchObject({
    attempts: 1,
    renders,
  });
});

test('does not commit a failed completion after unmount', async ({ page }) => {
  await page.evaluate(() => window.orderDemoHarness.submit());
  await waitForAttempt(page, 1);
  await page.evaluate(() => window.orderDemoHarness.unmount());
  const renders = await page.evaluate(() => window.orderDemoHarness.counts().renders);
  await page.evaluate(() => window.orderDemoHarness.reject(0, 'unknown', ''));
  expect(await page.evaluate(() => window.orderDemoHarness.counts().renders)).toBe(
    renders,
  );
});
