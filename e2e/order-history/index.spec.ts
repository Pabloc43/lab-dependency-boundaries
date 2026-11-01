import { expect, test, type Page } from '@playwright/test';
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import type {} from './fixture';

let harnessScript: string;
const order = {
  id: 'one',
  lines: [{ productId: 'book', name: 'Book', quantity: 1, unitPriceCents: 100 }],
  totalCents: 100,
};

async function view(page: Page) {
  return JSON.parse((await page.locator('output').textContent())!);
}

async function waitForReads(page: Page, count: number) {
  await expect
    .poll(() => page.evaluate(() => window.historyHarness.counts().reads))
    .toBe(count);
}

async function loadOrders(page: Page) {
  await page.evaluate((value) => window.historyHarness.resolveRead(0, [value]), order);
  await expect.poll(async () => (await view(page)).orders).toEqual([order]);
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
        name: 'OrderHistoryHarness',
      },
    },
  });
  const outputs = Array.isArray(result) ? result : [result];
  harnessScript = outputs
    .flatMap((output) => ('output' in output ? output.output : []))
    .filter((output) => output.type === 'chunk')
    .map((output) => output.code)
    .join('\n');
  expect(harnessScript).toContain('historyHarness');
});

test.beforeEach(async ({ page }) => {
  await page.route('**/order-history-harness.js', (route) =>
    route.fulfill({
      contentType: 'text/javascript; charset=utf-8',
      body: harnessScript,
    }),
  );
  await page.route('**/order-history-harness', (route) =>
    route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><html><body><div id="root"></div><script src="/order-history-harness.js"></script></body></html>',
    }),
  );
  await page.goto('/order-history-harness');
  await waitForReads(page, 1);
});

test('an older read cannot resurrect orders after confirmed clear', async ({ page }) => {
  await page.evaluate(() => {
    void window.historyHarness.clear();
  });
  await expect
    .poll(() => page.evaluate(() => window.historyHarness.counts().deletes))
    .toBe(1);
  await page.evaluate(() => window.historyHarness.resolveClear(0));
  await waitForReads(page, 2);
  await page.evaluate(() => window.historyHarness.resolveRead(1, []));
  await expect.poll(async () => (await view(page)).notice).toContain('Se borró');
  await page.evaluate((value) => window.historyHarness.resolveRead(0, [value]), order);
  await expect.poll(async () => (await view(page)).orders).toEqual([]);
  await expect.poll(async () => (await view(page)).notice).toContain('Se borró');
});

test('a read started during clear is also discarded when deletion succeeds', async ({
  page,
}) => {
  await loadOrders(page);
  await page.evaluate(() => {
    void window.historyHarness.clear();
    window.historyHarness.changeSaved();
  });
  await waitForReads(page, 2);
  await page.evaluate(() => window.historyHarness.resolveClear(0));
  await waitForReads(page, 3);
  await page.evaluate(() => window.historyHarness.resolveRead(2, []));
  await expect.poll(async () => (await view(page)).notice).toContain('Se borró');
  await page.evaluate((value) => window.historyHarness.resolveRead(1, [value]), order);
  await expect.poll(async () => (await view(page)).orders).toEqual([]);
  expect((await view(page)).notice).toContain('Se borró');
});

test('two same-tick clear requests invoke the service once', async ({ page }) => {
  await loadOrders(page);
  await page.evaluate(() => window.historyHarness.doubleClear());
  await expect
    .poll(() => page.evaluate(() => window.historyHarness.counts().deletes))
    .toBe(1);
  await expect
    .poll(() => page.evaluate(() => window.historyHarness.results()))
    .toEqual([false]);
  await page.evaluate(() => window.historyHarness.resolveClear(0));
  await expect
    .poll(() => page.evaluate(() => window.historyHarness.results()))
    .toEqual([false, true]);
});

test('failed clear keeps the list and never announces success', async ({ page }) => {
  await loadOrders(page);
  await page.evaluate(() => {
    void window.historyHarness.clear();
  });
  await page.evaluate(() => window.historyHarness.rejectClear(0, 'Delete blocked'));
  await expect.poll(async () => (await view(page)).error).toBe('Delete blocked');
  expect(await view(page)).toMatchObject({ orders: [order], pending: false, notice: '' });
});

test('saved changes during a failed clear still refresh without hiding its error', async ({
  page,
}) => {
  await loadOrders(page);
  await page.evaluate(() => {
    void window.historyHarness.clear();
    window.historyHarness.changeSaved();
  });
  await waitForReads(page, 2);
  await page.evaluate(() => window.historyHarness.rejectClear(0, 'Delete blocked'));
  await expect.poll(async () => (await view(page)).error).toBe('Delete blocked');
  await page.evaluate(() => window.historyHarness.resolveRead(1, []));
  await expect.poll(async () => (await view(page)).orders).toEqual([]);
  expect(await view(page)).toMatchObject({
    error: 'Delete blocked',
    notice: '',
    pending: false,
  });
});

test('background read failure does not end clearing or replace its failure', async ({
  page,
}) => {
  await loadOrders(page);
  await page.evaluate(() => {
    void window.historyHarness.clear();
    window.historyHarness.changeSaved();
  });
  await waitForReads(page, 2);
  await page.evaluate(() => window.historyHarness.rejectRead(1, 'Read blocked'));
  expect(await view(page)).toMatchObject({ pending: true, error: '', notice: '' });
  await page.evaluate(() => window.historyHarness.rejectClear(0, 'Delete blocked'));
  await expect.poll(async () => (await view(page)).error).toBe('Delete blocked');
  expect(await view(page)).toMatchObject({ orders: [order], notice: '', pending: false });
});

test('confirmed clear and subsequent read failure are distinct outcomes', async ({
  page,
}) => {
  await loadOrders(page);
  await page.evaluate(() => {
    void window.historyHarness.clear();
  });
  await page.evaluate(() => window.historyHarness.resolveClear(0));
  await waitForReads(page, 2);
  await page.evaluate(() => window.historyHarness.rejectRead(1, null));
  await expect
    .poll(async () => (await view(page)).error)
    .toBe('No se pudo leer el historial.');
  expect(await view(page)).toMatchObject({ orders: [], pending: false });
  expect((await view(page)).notice).toContain('Se borró');
});

test('an empty read error remains a visible failure, not an empty successful history', async ({
  page,
}) => {
  await page.evaluate(() => window.historyHarness.rejectRead(0, '   '));
  await expect
    .poll(async () => (await view(page)).error)
    .toBe('No se pudo leer el historial.');
  expect(await view(page)).toMatchObject({ orders: [], pending: false, notice: '' });
});

test('unknown clear failures use the delete fallback', async ({ page }) => {
  await loadOrders(page);
  await page.evaluate(() => {
    void window.historyHarness.clear();
  });
  await page.evaluate(() => window.historyHarness.rejectClear(0, null));
  await expect
    .poll(async () => (await view(page)).error)
    .toBe('No se pudo borrar el historial.');
});

test('unmount discards pending reads and does not confirm a pending clear', async ({
  page,
}) => {
  await page.evaluate(() => {
    void window.historyHarness.clear();
    window.historyHarness.unmount();
  });
  const renderCount = await page.evaluate(() => window.historyHarness.counts().renders);
  await page.evaluate((value) => {
    window.historyHarness.resolveRead(0, [value]);
    window.historyHarness.resolveClear(0);
  }, order);
  await expect
    .poll(() => page.evaluate(() => window.historyHarness.results()))
    .toEqual([false]);
  expect(await page.evaluate(() => window.historyHarness.counts().renders)).toBe(
    renderCount,
  );
  expect(await page.evaluate(() => window.historyHarness.counts().reads)).toBe(1);
});
