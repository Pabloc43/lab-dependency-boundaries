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

test('restores multiple orders after reload and clears only its own storage key', async ({
  page,
}) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.setItem('unrelated-lab-sentinel', 'keep'));
  await page.getByRole('button', { name: 'Crear pedido', exact: true }).click();
  await page.getByLabel('Cantidad de Cuaderno de taller').fill('2');
  await page.getByRole('button', { name: 'Crear pedido', exact: true }).click();

  const history = page.getByRole('region', {
    name: 'Historial de este navegador',
    exact: true,
  });
  await expect(history.locator('ol > li')).toHaveCount(2);
  await expect(history.locator('ol > li').first()).toContainText('32,00');

  await page.reload();
  await expect(history.locator('ol > li')).toHaveCount(2);
  await expect(page.getByLabel('Cantidad de Cuaderno de taller')).toHaveValue('1');

  await history.getByRole('button', { name: 'Borrar historial de este lab' }).click();
  await expect(history.getByText('No hay pedidos guardados.')).toBeVisible();

  await page.reload();
  await expect(history.getByText('No hay pedidos guardados.')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('unrelated-lab-sentinel'))).toBe(
    'keep',
  );
});

test('reports incompatible storage without overwriting it and allows explicit reset', async ({
  page,
}) => {
  await page.addInitScript(
    () =>
      window === window.top &&
      localStorage.setItem(
        'lab-dependency-boundaries:orders:v1',
        '{"version":99,"orders":[]}',
      ),
  );
  await page.goto('./');

  const history = page.getByRole('region', {
    name: 'Historial de este navegador',
    exact: true,
  });
  await expect(history.getByRole('alert')).toContainText('incompatibles');

  await page.getByRole('button', { name: 'Crear pedido', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Pedido creado' })).toHaveCount(
    0,
  );
  expect(
    await page.evaluate(() =>
      localStorage.getItem('lab-dependency-boundaries:orders:v1'),
    ),
  ).toBe('{"version":99,"orders":[]}');

  await history.getByRole('button', { name: 'Borrar historial de este lab' }).click();
  await expect(history.getByText('No hay pedidos guardados.')).toBeVisible();

  await page.getByRole('button', { name: 'Crear pedido', exact: true }).click();
  await expect(history.locator('ol > li')).toHaveCount(1);
});

test('handles blocked storage access and quota without false success', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => {
        throw new DOMException('Blocked', 'SecurityError');
      },
    });
  });
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Mesa de pedidos' })).toBeVisible();

  await page.getByRole('button', { name: 'Crear pedido', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Pedido creado' })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole('region', { name: 'Historial de este navegador' }).getByRole('alert'),
  ).toContainText('bloqueado');
});

test('does not leak a simulated failure after validation and recovers from write failure', async ({
  page,
}) => {
  await page.goto('./');
  await page.getByLabel('Simular una falla al guardar').check();
  await page.getByLabel('Cantidad de Cuaderno de taller').fill('1.5');
  await page.getByRole('button', { name: 'Crear pedido', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('entero');

  await page.getByLabel('Cantidad de Cuaderno de taller').fill('1');
  await page.getByRole('button', { name: 'Crear pedido', exact: true }).click();

  const history = page.getByRole('region', { name: 'Historial de este navegador' });
  await expect(history.locator('ol > li')).toHaveCount(1);

  await page.evaluate(() => {
    const original = Storage.prototype.setItem;

    Storage.prototype.setItem = function (key, value) {
      Storage.prototype.setItem = original;
      throw new DOMException(`${key}:${value}`, 'QuotaExceededError');
    };
  });
  await page.getByRole('button', { name: 'Crear pedido', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('espacio');
  await expect(page.getByRole('status').filter({ hasText: 'Pedido creado' })).toHaveCount(
    0,
  );
  await expect(history.locator('ol > li')).toHaveCount(1);

  await page.getByRole('button', { name: 'Crear pedido', exact: true }).click();
  await expect(history.locator('ol > li')).toHaveCount(2);
});

test('shows real coupled and injected sources with functional provenance and exact rules', async ({
  page,
}) => {
  const response = await page.request.get(
    'http://127.0.0.1:4173/lab-dependency-boundaries/evidence.json',
  );
  const evidence = await response.json();

  await page.goto('./');
  await page.getByRole('button', { name: 'Persistencia acoplada', exact: true }).click();

  for (const [id, path] of [
    [
      'persistence-coupling',
      'fixtures/persistence-coupling/src/application/create-order.ts',
    ],
    ['persistence-injected', 'src/features/orders/application/create-order.ts'],
  ]) {
    const block = page.getByRole('region', {
      name: `Código de persistencia: ${id}`,
      exact: true,
    });
    expect(await block.locator('code').textContent()).toBe(evidence.snippets[path]);
    expect(
      await block
        .locator('span')
        .evaluateAll(
          (tokens) => new Set(tokens.map((token) => getComputedStyle(token).color)).size,
        ),
    ).toBeGreaterThan(1);
    expect(
      evidence.results.find((item: { id: string }) => item.id === id).verification
        .saveRecoverClear,
    ).toBe(true);
  }

  await expect(
    page.locator('strong').filter({ hasText: /^no-application-outward$/ }),
  ).toHaveCount(1);
  await expect(page.getByText('SIN INFRACCIONES', { exact: true })).toBeVisible();

  await page
    .getByText('Ver el contrato, el adaptador y la composición reales', { exact: true })
    .click();

  const codecPath =
    'src/features/orders/infrastructure/order-repositories/local-storage/order-storage-codec/index.ts';
  const codec = page.getByRole('region', {
    name: `Código real: ${codecPath}`,
    exact: true,
  });
  expect(await codec.locator('code').textContent()).toBe(evidence.snippets[codecPath]);
  expect(
    await codec
      .locator('span')
      .evaluateAll(
        (tokens) => new Set(tokens.map((token) => getComputedStyle(token).color)).size,
      ),
  ).toBeGreaterThan(1);

  await loadDiagrams(page);

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('keeps save success distinct from a subsequent history read failure', async ({
  page,
}) => {
  await page.goto('./');
  await expect(
    page.getByText('No hay pedidos guardados.', { exact: true }),
  ).toBeVisible();

  await page.evaluate(() => {
    const originalRead = Storage.prototype.getItem;
    const originalWrite = Storage.prototype.setItem;

    Storage.prototype.setItem = function (key, value) {
      originalWrite.call(this, key, value);
      Storage.prototype.getItem = function (readKey) {
        if (readKey === 'lab-dependency-boundaries:orders:v1') {
          throw new DOMException('Read failed', 'SecurityError');
        }

        return originalRead.call(this, readKey);
      };
    };
  });
  await page.getByRole('button', { name: 'Crear pedido', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Pedido creado' }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Historial de este navegador' }).getByRole('alert'),
  ).toContainText('leer');
});

test('clears stale success messages and reports a real clear failure', async ({
  page,
}) => {
  await page.goto('./');

  const history = page.getByRole('region', { name: 'Historial de este navegador' });

  await page.getByRole('button', { name: 'Crear pedido', exact: true }).click();
  await expect(history.locator('ol > li')).toHaveCount(1);

  await page.evaluate(() => {
    const original = Storage.prototype.removeItem;

    Storage.prototype.removeItem = function (key) {
      Storage.prototype.removeItem = original;
      throw new DOMException(key, 'SecurityError');
    };
  });
  await history.getByRole('button', { name: 'Borrar historial de este lab' }).click();
  await expect(history.getByRole('alert')).toContainText('borrar');
  await expect(history.locator('ol > li')).toHaveCount(1);

  await history.getByRole('button', { name: 'Borrar historial de este lab' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Pedido creado' })).toHaveCount(
    0,
  );
  await expect(history.getByRole('status').filter({ hasText: 'Se borró' })).toBeVisible();

  await page.getByRole('button', { name: 'Crear pedido', exact: true }).click();
  await expect(history.locator('ol > li')).toHaveCount(1);
  await expect(history.getByRole('status').filter({ hasText: 'Se borró' })).toHaveCount(
    0,
  );

  await page.getByLabel('Simular una falla al guardar').check();
  await page.getByRole('button', { name: 'Crear pedido', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('simulada');
  await expect(history.locator('ol > li')).toHaveCount(1);
  await expect(history.getByRole('status').filter({ hasText: 'Se borró' })).toHaveCount(
    0,
  );
});

test('keeps the persistence explanation usable with evidence from an older build', async ({
  page,
}) => {
  const errors: string[] = [];

  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/evidence.json', async (route) => {
    const response = await route.fetch();
    const evidence = await response.json();

    evidence.results = evidence.results.filter(
      (item: { id: string }) => !item.id.startsWith('persistence-'),
    );
    delete evidence.snippets[
      'fixtures/persistence-coupling/src/application/create-order.ts'
    ];
    delete evidence.snippets['src/features/orders/application/order-repository.ts'];
    delete evidence.snippets[
      'src/features/orders/infrastructure/order-repositories/local-storage/index.ts'
    ];
    await route.fulfill({ response, json: evidence });
  });
  await page.goto('./');
  await page.getByRole('button', { name: 'Persistencia acoplada', exact: true }).click();
  await expect(
    page.getByText(
      'Esta versión de la evidencia no incluye el informe de esta variante.',
      { exact: true },
    ),
  ).toHaveCount(2);
  await expect(
    page.getByText(
      'Esta versión de la evidencia no incluye el código de esta variante.',
      { exact: true },
    ),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('explains startup versus saving with literal source excerpts and keyboard disclosure', async ({
  page,
}) => {
  const response = await page.request.get(
    'http://127.0.0.1:4173/lab-dependency-boundaries/evidence.json',
  );
  const evidence = await response.json();

  await page.goto('./');
  await page.getByRole('button', { name: 'Persistencia acoplada', exact: true }).click();

  const walkthrough = page.getByRole('region', {
    name: 'Del arranque al guardado',
    exact: true,
  });
  await expect(
    walkthrough.getByRole('region', { name: 'Recorrido real: bootstrap', exact: true }),
  ).toBeVisible();
  await expect(
    walkthrough.getByRole('region', { name: 'Recorrido real: app-props', exact: true }),
  ).toBeVisible();
  await expect(
    walkthrough.getByText('son esos servicios como props:', { exact: false }),
  ).toBeVisible();

  const summary = walkthrough.getByText(
    'Ver cómo se ensamblan y ejecutan los servicios',
    { exact: true },
  );

  await summary.focus();
  await summary.press('Enter');
  await expect(summary.locator('..')).toHaveAttribute('open', '');
  await expect(
    walkthrough.getByText('Fragmento no incluido en esta versión de la evidencia.', {
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    walkthrough.getByText('Este recorrido distingue llamadas de imports.', {
      exact: false,
    }),
  ).toBeVisible();

  for (const excerpt of evidence.walkthrough) {
    expect(excerpt.code.language).toBe(
      excerpt.path.endsWith('.tsx') ? 'tsx' : 'typescript',
    );

    const block = walkthrough.getByRole('region', {
      name: `Recorrido real: ${excerpt.id}`,
      exact: true,
    });
    expect(await block.locator('code').textContent()).toBe(excerpt.source);

    const location = `${excerpt.path} · L${excerpt.startLine}:C${excerpt.startColumn}–L${excerpt.endLine}:C${excerpt.endColumn}`;
    await expect(block.locator('..').getByText(location, { exact: true })).toBeVisible();
    expect(
      await block
        .locator('span')
        .evaluateAll(
          (tokens) =>
            new Set(
              tokens
                .filter((token) => token.textContent?.trim())
                .map((token) => getComputedStyle(token).color),
            ).size,
        ),
    ).toBeGreaterThan(1);
  }

  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);

  await loadDiagrams(page);

  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(result.violations).toEqual([]);

  await summary.focus();
  await summary.press('Space');
  await expect(summary.locator('..')).not.toHaveAttribute('open', '');
});

test('keeps existing examples usable when an older build has no source walkthrough', async ({
  page,
}) => {
  const errors: string[] = [];

  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/evidence.json', async (route) => {
    const response = await route.fetch();
    const evidence = await response.json();

    delete evidence.walkthrough;
    await route.fulfill({ response, json: evidence });
  });
  await page.goto('./');
  await page.getByRole('button', { name: 'Persistencia acoplada', exact: true }).click();
  await expect(
    page.getByText('Esta versión de la evidencia no incluye el recorrido del código.', {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', {
      name: 'Código de persistencia: persistence-injected',
      exact: true,
    }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('labels cached adapter and codec snippets with their actual historical source paths', async ({
  page,
}) => {
  const aliases = [
    [
      'src/features/orders/infrastructure/order-repositories/local-storage/index.ts',
      'src/features/orders/infrastructure/local-storage-order-repository.ts',
    ],
    [
      'src/features/orders/infrastructure/order-repositories/local-storage/order-storage-codec/index.ts',
      'src/features/orders/infrastructure/order-storage-codec.ts',
    ],
  ];
  const sources: Record<string, string> = {};

  await page.route('**/evidence.json', async (route) => {
    const response = await route.fetch();
    const evidence = await response.json();

    for (const [current, historical] of aliases) {
      sources[historical] = evidence.snippets[current];
      evidence.snippets[historical] = evidence.snippets[current];
      delete evidence.snippets[current];
      delete evidence.highlightedSnippets;
    }

    await route.fulfill({ response, json: evidence });
  });
  await page.goto('./');
  await page.getByRole('button', { name: 'Persistencia acoplada', exact: true }).click();
  await page
    .getByText('Ver el contrato, el adaptador y la composición reales', { exact: true })
    .click();

  for (const [, historical] of aliases) {
    const block = page.getByRole('region', {
      name: `Código real: ${historical}`,
      exact: true,
    });
    expect(await block.locator('code').textContent()).toBe(sources[historical]);
    await expect(
      block.locator('..').getByText(historical, { exact: true }),
    ).toBeVisible();
  }
});

const minimalViewer = `<!doctype html><html><body>
<svg xmlns="http://www.w3.org/2000/svg" data-quality-profile="showcase" role="img" aria-labelledby="title desc">
  <title id="title">Demo title</title>
  <desc id="desc">Demo description</desc>
  <g data-node-id="node" role="button" tabindex="0" aria-label="Node"></g>
</svg>
</body></html>`;

const viewerValidationCases = [
  { name: 'img container', html: minimalViewer, ready: true },
  {
    name: 'group container',
    html: minimalViewer.replace('role="img"', 'role="group"'),
    ready: true,
  },
  {
    name: 'resolved empty label text',
    html: minimalViewer.replace('Demo title', ''),
    ready: true,
  },
  {
    name: 'internal label whitespace',
    html: minimalViewer.replace('title desc', 'title \t desc'),
    ready: true,
  },
  {
    name: 'missing SVG',
    html: '<!doctype html><html><body>No SVG</body></html>',
    ready: false,
  },
  {
    name: 'missing label references',
    html: minimalViewer.replace(' aria-labelledby="title desc"', ''),
    ready: false,
  },
  {
    name: 'empty label references',
    html: minimalViewer.replace('title desc', ''),
    ready: false,
  },
  {
    name: 'dangling label reference',
    html: minimalViewer.replace('title desc', 'title missing'),
    ready: false,
  },
  {
    name: 'whitespace-only references',
    html: minimalViewer.replace('title desc', ' \t '),
    ready: false,
  },
  {
    name: 'padded label references',
    html: minimalViewer.replace('title desc', ' title desc '),
    ready: false,
  },
  {
    name: 'missing interactive node',
    html: minimalViewer.replace('data-node-id="node"', ''),
    ready: false,
  },
  {
    name: 'unsupported container role',
    html: minimalViewer.replace('role="img"', 'role="presentation"'),
    ready: false,
  },
];

for (const scenario of viewerValidationCases) {
  test(`preserves embedded viewer validation: ${scenario.name}`, async ({ page }) => {
    await page.route('**/diagrams/architecture.html', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: scenario.html,
      }),
    );
    await page.goto('./');

    // Evaluate the previous guard against the same real DOM semantics, including
    // empty strings, dangling IDs and whitespace. The mounted component uses the new guard.
    const previouslyAccepted = await page.evaluate((html) => {
      const document = new DOMParser().parseFromString(html, 'text/html');
      const diagram = document.querySelector('svg[data-quality-profile="showcase"]');
      const labelledBy = diagram?.getAttribute('aria-labelledby')?.split(/\s+/);
      const hasDescription = labelledBy?.every((id) => document.getElementById(id));
      const hasInteractiveNodes = diagram?.querySelector('[data-node-id][role="button"]');
      const role = diagram?.getAttribute('role');

      return !(
        !diagram ||
        !labelledBy?.length ||
        !hasDescription ||
        !hasInteractiveNodes ||
        (role !== 'img' && role !== 'group')
      );
    }, scenario.html);
    expect(previouslyAccepted).toBe(scenario.ready);

    const viewer = page.getByRole('region', {
      name: 'Mapa de dependencias',
      exact: true,
    });

    await viewer.scrollIntoViewIfNeeded();
    await expect(viewer.locator('[data-viewer-state]')).toHaveAttribute(
      'data-viewer-state',
      previouslyAccepted ? 'ready' : 'failed',
    );

    if (scenario.ready) {
      const frame = page.frameLocator('iframe[title="Mapa de dependencias"]');
      const svg = frame.locator('svg[data-quality-profile="showcase"]');
      await expect(svg).toHaveAttribute('role', 'group');

      const originalReferences = await page.evaluate(
        (html) =>
          new DOMParser()
            .parseFromString(html, 'text/html')
            .querySelector('svg')
            ?.getAttribute('aria-labelledby'),
        scenario.html,
      );
      await expect(svg).toHaveAttribute('aria-labelledby', originalReferences ?? '');
      await expect(frame.locator('[data-node-id][role="button"]')).toHaveCount(1);
    } else {
      await expect(viewer.locator('iframe')).toHaveCount(0);
      await expect(viewer.getByRole('status')).toContainText(
        'No fue posible preparar el visor integrado.',
      );
      await expect(
        viewer.getByRole('link', { name: 'Abrir diagrama interactivo ↗', exact: true }),
      ).toBeVisible();
    }
  });
}

test('keeps evidence chrome visible while loading and after a fetch error', async ({
  page,
}) => {
  let release = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });

  await page.route('**/evidence.json', async (route) => {
    await pending;
    await route.fulfill({ status: 503, contentType: 'text/plain', body: 'Unavailable' });
  });

  try {
    await page.goto('./');

    const explorer = page.locator('#evidencia');
    const selector = explorer.getByRole('group', {
      name: 'Elegir ejemplo de análisis',
      exact: true,
    });
    await expect(explorer.getByRole('status')).toHaveText(
      'Cargando el informe generado…',
    );
    await expect(
      explorer.getByRole('heading', {
        name: 'Romperlo también es una prueba.',
        exact: true,
      }),
    ).toBeVisible();
    await expect(selector.getByRole('button')).toHaveText([
      'Import incorrecto',
      'Dependencia circular',
      'Aplicación válida',
      'Persistencia acoplada',
    ]);

    const configuration = explorer.getByText(
      'Ver la configuración que usa este proyecto',
      { exact: true },
    );

    await configuration.click();
    await expect(
      configuration.locator('..').getByText('Cargando…', { exact: true }),
    ).toBeVisible();
    await expect(
      explorer.getByRole('link', { name: 'Consultar JSON completo ↗', exact: true }),
    ).toBeVisible();

    release();
    await expect(explorer.getByRole('alert')).toContainText(
      'No fue posible cargar la evidencia.',
    );
    await expect(
      explorer.getByRole('heading', {
        name: 'Romperlo también es una prueba.',
        exact: true,
      }),
    ).toBeVisible();
    await expect(selector.getByRole('button')).toHaveCount(4);
    await expect(configuration).toBeVisible();
    await expect(
      configuration.locator('..').getByText('Cargando…', { exact: true }),
    ).toBeVisible();
    await expect(
      explorer.getByRole('link', { name: 'Consultar JSON completo ↗', exact: true }),
    ).toBeVisible();

    await selector
      .getByRole('button', { name: 'Dependencia circular', exact: true })
      .click();
    await expect(
      selector.getByRole('button', { name: 'Dependencia circular', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(explorer.getByRole('alert')).toBeVisible();
  } finally {
    release();
  }
});

test('switches all four evidence examples without changing selection semantics', async ({
  page,
}) => {
  await page.goto('./');

  const explorer = page.locator('#evidencia');
  const selector = explorer.getByRole('group', {
    name: 'Elegir ejemplo de análisis',
    exact: true,
  });
  const labels = [
    'Import incorrecto',
    'Dependencia circular',
    'Aplicación válida',
    'Persistencia acoplada',
  ];
  await expect(selector.getByRole('button')).toHaveText(labels);
  await expect(
    explorer.getByRole('region', {
      name: 'Código del ejemplo seleccionado',
      exact: true,
    }),
  ).toBeVisible();

  await selector.getByRole('button', { name: labels[1], exact: true }).click();
  await expect(
    explorer.getByRole('group', { name: 'Ciclo detectado', exact: true }),
  ).toBeVisible();

  await selector.getByRole('button', { name: labels[2], exact: true }).click();
  await expect(explorer.getByText('SIN INFRACCIONES', { exact: true })).toBeVisible();

  await selector.getByRole('button', { name: labels[3], exact: true }).click();
  await expect(
    explorer.getByRole('heading', {
      name: 'Guardar funciona. El acoplamiento sigue siendo un problema.',
      exact: true,
    }),
  ).toBeVisible();

  await selector.getByRole('button', { name: labels[0], exact: true }).click();
  await expect(
    explorer.getByRole('region', {
      name: 'Código del ejemplo seleccionado',
      exact: true,
    }),
  ).toBeVisible();
  await expect(selector.locator('button[aria-pressed="true"]')).toHaveText(labels[0]);
  await expect(selector.locator('button[aria-pressed="false"]')).toHaveCount(3);
});

test('preserves empty current snippets, missing-code fallback and absent reports', async ({
  page,
}) => {
  const current = 'src/features/orders/application/create-order.ts';

  await page.route('**/evidence.json', async (route) => {
    const response = await route.fetch();
    const evidence = await response.json();

    delete evidence.snippets['fixtures/domain-to-ui/src/domain/order.ts'];
    evidence.snippets[current] = '';
    evidence.snippets['src/application/create-order.ts'] =
      'legacy source must not replace an empty current snippet';
    evidence.results = evidence.results.filter(
      (result: { id: string }) => result.id !== 'valid',
    );
    await route.fulfill({ response, json: evidence });
  });
  await page.goto('./');

  const explorer = page.locator('#evidencia');
  await expect(
    explorer.getByText(
      'Esta versión de la evidencia no incluye el código del ejemplo seleccionado.',
      { exact: true },
    ),
  ).toBeVisible();

  await explorer.getByRole('button', { name: 'Aplicación válida', exact: true }).click();

  const code = explorer.getByRole('region', {
    name: 'Código del ejemplo seleccionado',
    exact: true,
  });
  expect(await code.locator('code').textContent()).toBe('');
  await expect(code.locator('..').getByText(current, { exact: true })).toBeVisible();
  await expect(
    explorer.getByText('INFORME NO DISPONIBLE', { exact: true }),
  ).toBeVisible();
  await expect(
    explorer.getByRole('heading', { name: '0 infracciones', exact: true }),
  ).toHaveCount(0);
  await expect(explorer.getByText('INFRACCIÓN ESPERADA', { exact: true })).toHaveCount(0);
  await expect(
    explorer.getByText(
      'Esta versión de la evidencia no incluye el código del ejemplo seleccionado.',
      { exact: true },
    ),
  ).toHaveCount(0);
});

test('keeps empty current persistence detail snippets instead of substituting legacy sources', async ({
  page,
}) => {
  const currentPaths = [
    'src/features/orders/application/order-repository.ts',
    'src/features/orders/infrastructure/order-repositories/local-storage/index.ts',
    'src/features/orders/infrastructure/order-repositories/local-storage/order-storage-codec/index.ts',
    'src/app/composition.ts',
  ];

  await page.route('**/evidence.json', async (route) => {
    const response = await route.fetch();
    const evidence = await response.json();

    for (const path of currentPaths) {
      evidence.snippets[path] = '';
    }

    evidence.snippets[
      'src/features/orders/infrastructure/local-storage-order-repository.ts'
    ] = 'Legacy adapter must not replace an empty current source';
    evidence.snippets['src/features/orders/infrastructure/order-storage-codec.ts'] =
      'Legacy codec must not replace an empty current source';

    await route.fulfill({ response, json: evidence });
  });

  await page.goto('./');
  await page.getByRole('button', { name: 'Persistencia acoplada', exact: true }).click();

  const summary = page.getByText(
    'Ver el contrato, el adaptador y la composición reales',
    { exact: true },
  );
  await summary.click();

  const details = summary.locator('..');
  await expect(details.getByRole('region')).toHaveCount(4);

  for (const path of currentPaths) {
    const block = details.getByRole('region', {
      name: `Código real: ${path}`,
      exact: true,
    });

    expect(await block.locator('code').textContent()).toBe('');
    await expect(block.locator('..').getByText(path, { exact: true })).toBeVisible();
  }

  await expect(
    details.getByText('Código no incluido en esta versión.', { exact: true }),
  ).toHaveCount(0);
});

test('shows the excerpt fallback for one missing record without hiding the rest of the walkthrough', async ({
  page,
}) => {
  let remainingSource = '';

  await page.route('**/evidence.json', async (route) => {
    const response = await route.fetch();
    const evidence = await response.json();

    evidence.walkthrough = evidence.walkthrough.filter(
      (excerpt: { id: string }) => excerpt.id !== 'bootstrap',
    );
    remainingSource = evidence.walkthrough.find(
      (excerpt: { id: string }) => excerpt.id === 'app-props',
    ).source;

    await route.fulfill({ response, json: evidence });
  });

  await page.goto('./');
  await page.getByRole('button', { name: 'Persistencia acoplada', exact: true }).click();

  const walkthrough = page.getByRole('region', {
    name: 'Del arranque al guardado',
    exact: true,
  });
  await expect(
    walkthrough.getByText('Fragmento no incluido en esta versión de la evidencia.', {
      exact: true,
    }),
  ).toHaveCount(1);
  await expect(
    walkthrough.getByRole('region', { name: 'Recorrido real: bootstrap', exact: true }),
  ).toHaveCount(0);

  const remaining = walkthrough.getByRole('region', {
    name: 'Recorrido real: app-props',
    exact: true,
  });
  expect(await remaining.locator('code').textContent()).toBe(remainingSource);
  await expect(remaining).toBeVisible();
  await expect(
    walkthrough.getByText('Ver cómo se ensamblan y ejecutan los servicios', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    walkthrough.getByText(
      'Esta versión de la evidencia no incluye el recorrido del código.',
      { exact: false },
    ),
  ).toHaveCount(0);
});

for (const malformed of [
  { name: 'missing root fields', data: {} },
  {
    name: 'invalid optional tokens',
    data: {
      generatedAt: '2026-11-01T12:00:00Z',
      results: [],
      snippets: {},
      highlightedSnippets: {
        code: {
          source: '',
          language: 'typescript',
          lines: [{ ending: '', tokens: null }],
        },
      },
    },
  },
]) {
  test(`handles malformed successful evidence responses: ${malformed.name}`, async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.route('**/evidence.json', (route) =>
      route.fulfill({ json: malformed.data }),
    );
    await page.goto('./');

    const explorer = page.locator('#evidencia');
    await expect(explorer.getByRole('alert')).toBeVisible();
    await expect(
      explorer.getByRole('button', { name: 'Aplicación válida', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Crear pedido', exact: true }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Pedido creado' }),
    ).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
}

for (const tampering of ['token text', 'line ending']) {
  test(`uses raw source when highlighted ${tampering} is inconsistent`, async ({
    page,
  }) => {
    const path = 'fixtures/domain-to-ui/src/domain/order.ts';
    let original = '';
    await page.route('**/evidence.json', async (route) => {
      const response = await route.fetch();
      const evidence = await response.json();
      original = evidence.snippets[path];
      const code = evidence.highlightedSnippets[path];
      if (tampering === 'token text') {
        code.lines[0].tokens[0].content = 'altered text';
      } else {
        code.lines[0].ending += '\n';
      }
      expect(code.source).toBe(original);
      await route.fulfill({ response, json: evidence });
    });
    await page.goto('./');

    const explorer = page.locator('#evidencia');
    const block = explorer.getByRole('region', {
      name: 'Código del ejemplo seleccionado',
      exact: true,
    });
    await expect(block).toBeVisible();
    expect(await block.locator('code').textContent()).toBe(original);
    await expect(block.locator('span')).toHaveCount(0);
    await explorer
      .getByText('Ver la configuración que usa este proyecto', { exact: true })
      .click();
    expect(
      await explorer
        .getByRole('region', { name: 'Configuración de dependency-cruiser', exact: true })
        .locator('span')
        .count(),
    ).toBeGreaterThan(1);
  });
}
