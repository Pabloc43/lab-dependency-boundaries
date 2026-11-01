import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

// Both variants execute copies of the shipped domain, ports and storage adapter.
// Only the coupled use case differs; nothing is patched in the production tree.
export function verifyPersistenceScenario(project = process.cwd()) {
  const sandbox = mkdtempSync(join(tmpdir(), 'persistence-boundaries-'));
  const root = 'fixtures/persistence-coupling/src';
  const real = 'src/features/orders';
  const sourcePaths = [
    'domain/order.ts',
    'application/order-repository.ts',
    'application/create-order.ts',
    'infrastructure/local-storage-order-repository.ts',
  ];
  try {
    for (const file of sourcePaths) {
      mkdirSync(join(sandbox, root, file, '..'), { recursive: true });
      cpSync(join(project, real, file), join(sandbox, root, file));
    }
    cpSync(
      join(project, '.dependency-cruiser.cjs'),
      join(sandbox, '.dependency-cruiser.cjs'),
    );
    writeFileSync(
      join(sandbox, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          strict: true,
          skipLibCheck: true,
          outDir: 'compiled',
          rootDir: root,
        },
        include: [root],
      }),
    );
    symlinkSync(join(project, 'node_modules'), join(sandbox, 'node_modules'), 'dir');
    writeFileSync(join(sandbox, 'package.json'), '{"type":"module"}');
    const snippets = {};
    const variants = [];
    for (const coupled of [true, false]) {
      const source = readFileSync(
        join(
          project,
          coupled
            ? `${root}/application/create-order.ts`
            : `${real}/application/create-order.ts`,
        ),
        'utf8',
      );
      writeFileSync(join(sandbox, root, 'application/create-order.ts'), source);
      snippets[
        coupled
          ? `${root}/application/create-order.ts`
          : `${real}/application/create-order.ts`
      ] = source;
      const compile = spawnSync(
        process.execPath,
        [join(project, 'node_modules/typescript/bin/tsc'), '--project', 'tsconfig.json'],
        { cwd: sandbox, encoding: 'utf8' },
      );
      assert.equal(
        compile.status,
        0,
        `Persistence variant did not compile: ${compile.stdout}${compile.stderr}`,
      );
      // Node ESM requires extensions; rewrite only emitted relative module specifiers.
      function rewrite(directory) {
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
          const path = join(directory, entry.name);
          if (entry.isDirectory()) {
            rewrite(path);
          } else if (path.endsWith('.js')) {
            writeFileSync(
              path,
              readFileSync(path, 'utf8').replace(
                /(from\s+['"])(\.[^'"]+)(['"])/g,
                '$1$2.js$3',
              ),
            );
          }
        }
      }
      rewrite(join(sandbox, 'compiled'));
      const runner = `
        import assert from 'node:assert/strict';
        import { createOrder } from './compiled/application/create-order.js';
        import { LocalStorageOrderRepository } from './compiled/infrastructure/local-storage-order-repository.js';
        const values = new Map();
        const storage = {getItem: key => values.get(key) ?? null, setItem: (key,value) => values.set(key,value), removeItem: key => values.delete(key)};
        const repository = new LocalStorageOrderRepository(() => storage);
        const submit = createOrder({${coupled ? 'getStorage: () => storage' : 'repository'}, catalog:[{id:'notebook',name:'Notebook',priceCents:1250}],nextId:()=> 'scenario-order'});
        const order = await submit([{productId:'notebook',quantity:2}]);
        const reopened = new LocalStorageOrderRepository(() => storage);
        assert.deepEqual(await reopened.list(),[order]);
        assert.equal(order.totalCents,2500);
        await reopened.clear();
        assert.deepEqual(await repository.list(),[]);
      `;
      writeFileSync(join(sandbox, 'run.mjs'), runner);
      const functional = spawnSync(process.execPath, ['run.mjs'], {
        cwd: sandbox,
        encoding: 'utf8',
      });
      assert.equal(
        functional.status,
        0,
        `Persistence behavior failed: ${functional.stderr}`,
      );
      const cruise = (reporter) =>
        spawnSync(
          process.execPath,
          [
            join(project, 'node_modules/dependency-cruiser/bin/dependency-cruiser.mjs'),
            '--config',
            '.dependency-cruiser.cjs',
            '--output-type',
            reporter,
            root,
          ],
          {
            cwd: sandbox,
            encoding: 'utf8',
            env: { ...process.env, DEPENDENCY_BOUNDARY_ROOT: root },
          },
        );
      const json = cruise('json');
      assert.equal(json.status, 0, json.stderr);
      const report = JSON.parse(json.stdout);
      const violations = report.summary.violations.map(({ from, to, rule }) => ({
        from,
        to,
        rule: rule.name,
      }));
      const expected = coupled
        ? [
            {
              from: `${root}/application/create-order.ts`,
              to: `${root}/infrastructure/local-storage-order-repository.ts`,
              rule: 'no-application-outward',
            },
          ]
        : [];
      assert.deepEqual(violations, expected);
      const errors = cruise('err');
      assert.equal(errors.status, coupled ? 1 : 0, errors.stderr);
      variants.push({
        id: coupled ? 'persistence-coupling' : 'persistence-injected',
        exitCode: errors.status,
        moduleCount: report.summary.totalCruised,
        violations,
        verification: {
          typecheck: true,
          saveRecoverClear: true,
          useCaseSource: coupled
            ? `${root}/application/create-order.ts`
            : `${real}/application/create-order.ts`,
          isolatedCopies: sourcePaths
            .filter((file) => file !== 'application/create-order.ts')
            .map((file) => `${real}/${file}`),
        },
      });
    }
    return { results: variants, snippets };
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
}
