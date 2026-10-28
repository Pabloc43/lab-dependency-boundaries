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
  await page
    .getByText('Ver la configuración que usa este proyecto', { exact: true })
    .click();
  await page.getByRole('button', { name: 'Dependencia circular', exact: true }).click();
  await page.getByText('Ver informe técnico del ciclo', { exact: true }).click();
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
  await page
    .getByRole('region', { name: 'Mapa de dependencias', exact: true })
    .scrollIntoViewIfNeeded();
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

test('uses selectable editor colors without changing example or configuration source', async ({
  page,
}) => {
  const response = await page.request.get(
    'http://127.0.0.1:4173/lab-dependency-boundaries/evidence.json',
  );
  const evidence = await response.json();
  await page.goto('./');
  const examples = [
    {
      button: 'Import incorrecto',
      source: evidence.snippets['fixtures/domain-to-ui/src/domain/order.ts'],
    },
    {
      button: 'Aplicación válida',
      source: evidence.snippets['src/features/orders/application/create-order.ts'],
    },
  ];
  for (const example of examples) {
    await page.getByRole('button', { name: example.button, exact: true }).click();
    const block = page.getByRole('region', {
      name: 'Código del ejemplo seleccionado',
      exact: true,
    });
    await expect(block).toBeVisible();
    expect(await block.locator('code').textContent()).toBe(example.source);
    const colors = await block
      .locator('span')
      .evaluateAll((tokens) => [
        ...new Set(
          tokens
            .filter((token) => token.textContent?.trim())
            .map((token) => getComputedStyle(token).color),
        ),
      ]);
    expect(colors.length).toBeGreaterThan(1);
    expect(await block.evaluate((element) => getComputedStyle(element).whiteSpace)).toBe(
      'pre',
    );
    expect(await block.evaluate((element) => getComputedStyle(element).overflowX)).toBe(
      'auto',
    );
  }
  await page.getByRole('button', { name: 'Dependencia circular', exact: true }).click();
  for (const file of ['a.ts', 'b.ts']) {
    const block = page.getByRole('region', { name: `Código de ${file}`, exact: true });
    await expect(block).toBeVisible();
    expect(await block.locator('code').textContent()).toBe(
      evidence.snippets[`fixtures/cycle/src/domain/${file}`],
    );
    const colors = await block
      .locator('span')
      .evaluateAll((tokens) => [
        ...new Set(
          tokens
            .filter((token) => token.textContent?.trim())
            .map((token) => getComputedStyle(token).color),
        ),
      ]);
    expect(colors.length).toBeGreaterThan(1);
  }
  await expect(
    page.getByRole('group', { name: 'Ciclo detectado', exact: true }),
  ).toHaveText('a.ts → b.ts → a.ts');
  await expect(
    page.getByText('Un import de dominio a dominio está permitido;', { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText('Es el nombre de una regla, no un valor booleano.', { exact: false }),
  ).toBeVisible();
  await page.getByText('Ver informe técnico del ciclo', { exact: true }).click();
  expect(
    await page
      .getByRole('region', { name: 'Informe técnico del ciclo', exact: true })
      .locator('code')
      .textContent(),
  ).toBe(
    JSON.stringify(
      evidence.results.find((result: { id: string }) => result.id === 'cycle').violations,
      null,
      2,
    ),
  );
  await page
    .getByText('Ver la configuración que usa este proyecto', { exact: true })
    .click();
  const config = page.getByRole('region', {
    name: 'Configuración de dependency-cruiser',
    exact: true,
  });
  expect(await config.locator('code').textContent()).toBe(
    evidence.snippets['.dependency-cruiser.cjs'],
  );
  const colors = await config
    .locator('span')
    .evaluateAll((tokens) => [
      ...new Set(
        tokens
          .filter((token) => token.textContent?.trim())
          .map((token) => getComputedStyle(token).color),
      ),
    ]);
  expect(colors.length).toBeGreaterThan(1);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
});

test('renders literal angle brackets as code text, never executable markup', async ({
  page,
}) => {
  const source = 'const literal = "<img src=x onerror=alert(1)>";\n';
  const dialogs: string[] = [];
  page.on('dialog', (dialog) => {
    dialogs.push(dialog.message());
    void dialog.dismiss();
  });
  await page.route('**/evidence.json', async (route) => {
    const response = await route.fetch();
    const evidence = await response.json();
    const file = 'fixtures/domain-to-ui/src/domain/order.ts';
    evidence.snippets[file] = source;
    evidence.highlightedSnippets[file] = {
      source,
      language: 'typescript',
      lines: [{ tokens: [{ content: source, color: '#ce9178' }], ending: '' }],
    };
    await route.fulfill({ response, json: evidence });
  });
  await page.goto('./');
  const block = page.getByRole('region', {
    name: 'Código del ejemplo seleccionado',
    exact: true,
  });
  await expect(block).toBeVisible();
  expect(await block.locator('code').textContent()).toBe(source);
  await expect(block.locator('img, script')).toHaveCount(0);
  expect(dialogs).toEqual([]);
});

test('keeps raw snippets and real reports usable with older evidence without tokens', async ({
  page,
}) => {
  let original: {
    snippets: Record<string, string>;
    results: { id: string; violations: unknown[] }[];
  };
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/evidence.json', async (route) => {
    const response = await route.fetch();
    const evidence = await response.json();
    original = evidence;
    delete evidence.highlightedSnippets;
    delete evidence.highlightedReports;
    delete evidence.snippets['fixtures/cycle/src/domain/a.ts'];
    delete evidence.snippets['fixtures/cycle/src/domain/b.ts'];
    for (const result of evidence.results) {
      for (const violation of result.violations) {
        delete violation.cyclePath;
      }
    }
    await route.fulfill({ response, json: evidence });
  });
  await page.goto('./');
  const block = page.getByRole('region', {
    name: 'Código del ejemplo seleccionado',
    exact: true,
  });
  await expect(block).toBeVisible();
  expect(await block.locator('code').textContent()).toBe(
    original!.snippets['fixtures/domain-to-ui/src/domain/order.ts'],
  );
  await page.getByRole('button', { name: 'Aplicación válida', exact: true }).click();
  expect(await block.locator('code').textContent()).toBe(
    original!.snippets['src/features/orders/application/create-order.ts'],
  );
  await page.getByRole('button', { name: 'Dependencia circular', exact: true }).click();
  await expect(
    page.getByText(
      'Esta versión de la evidencia no incluye el código de los dos fixtures.',
      { exact: false },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole('group', { name: 'Ciclo detectado', exact: true }),
  ).toHaveCount(0);
  await page.getByText('Ver informe técnico del ciclo', { exact: true }).click();
  expect(
    await page
      .getByRole('region', { name: 'Informe técnico del ciclo', exact: true })
      .locator('code')
      .textContent(),
  ).toBe(
    JSON.stringify(
      original!.results.find(({ id }) => id === 'cycle')?.violations,
      null,
      2,
    ),
  );
  await page
    .getByText('Ver la configuración que usa este proyecto', { exact: true })
    .click();
  const config = page.getByRole('region', {
    name: 'Configuración de dependency-cruiser',
    exact: true,
  });
  expect(await config.locator('code').textContent()).toBe(
    original!.snippets['.dependency-cruiser.cjs'],
  );
  expect(errors).toEqual([]);
});

test('shows the actual historical source key when an older cached build is served', async ({
  page,
}) => {
  await page.route('**/evidence.json', async (route) => {
    const response = await route.fetch();
    const evidence = await response.json();
    const current = 'src/features/orders/application/create-order.ts';
    const historical = 'src/application/create-order.ts';
    evidence.snippets[historical] = evidence.snippets[current];
    delete evidence.snippets[current];
    delete evidence.highlightedSnippets;
    await route.fulfill({ response, json: evidence });
  });
  await page.goto('./');
  await page.getByRole('button', { name: 'Aplicación válida', exact: true }).click();
  await expect(
    page.getByText('src/application/create-order.ts', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Código del ejemplo seleccionado', exact: true }),
  ).toContainText('export function createOrder');
});
