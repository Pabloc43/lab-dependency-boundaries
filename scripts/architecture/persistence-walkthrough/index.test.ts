import { afterEach, expect, it } from 'vitest';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { persistenceWalkthrough } from './index';

const temporary: string[] = [];

afterEach(() => {
  for (const directory of temporary) {
    rmSync(directory, { recursive: true, force: true });
  }

  temporary.length = 0;
});

it('extracts literal source ranges with original line and column positions', () => {
  const excerpts = persistenceWalkthrough();
  expect(excerpts).toHaveLength(11);

  for (const excerpt of excerpts) {
    const source = readFileSync(excerpt.path, 'utf8');
    expect(excerpt.source).toBe(source.slice(excerpt.start, excerpt.end));

    const startPrefix = source.slice(0, excerpt.start);
    const endPrefix = source.slice(0, excerpt.end - 1);
    expect(excerpt.startLine).toBe(startPrefix.split('\n').length);
    expect(excerpt.startColumn).toBe(excerpt.start - startPrefix.lastIndexOf('\n'));
    expect(excerpt.endLine).toBe(endPrefix.split('\n').length);
    expect(excerpt.endColumn).toBe(excerpt.end - 1 - endPrefix.lastIndexOf('\n'));
  }
});

it('connects assembly, props, form, hook, injected operation and real storage without rewriting source', () => {
  const sources = Object.fromEntries(
    persistenceWalkthrough().map((excerpt) => [excerpt.id, excerpt.source]),
  );
  expect(sources.bootstrap).toContain('const services = buildApp();');
  expect(sources.bootstrap).toContain('<App {...services} />');
  expect(sources['app-props']).toBe('<OrderDemo {...orderServices} />');
  expect(sources.repository).toContain(
    'new LocalStorageOrderRepository(() => window.localStorage)',
  );
  expect(sources.factory).toContain('const submitOrder = createOrder({');
  expect(sources.factory).toContain('async save(order)');
  expect(sources.factory).toContain('if (failNext)');
  expect(sources.service).toContain('return await submitOrder(lines);');
  expect(sources.hook).toBe('useOrderDemo(services)');
  expect(sources.form).toContain('onSubmit={handleSubmit}');
  expect(sources.handler).toContain('event.preventDefault();');
  expect(sources.handler).toContain('void submit();');
  expect(sources.submit).toBe(
    `const order = await submitOrder(lines);

      if (mounted.current) {
        dispatch({ type: 'succeeded', order });
      }`,
  );
  expect(sources['use-case']).toContain('await repository.save(order);');
  expect(sources.factory).toContain('await repository.save(order);');
  expect(sources.storage).toContain('this.getStorage().setItem(');
  expect(sources.storage).toContain('JSON.stringify({ version: 1, orders: next })');
});

it('fails visibly when an expected source node disappears or becomes ambiguous', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'persistence-walkthrough-'));

  temporary.push(sandbox);
  cpSync('src', join(sandbox, 'src'), { recursive: true });

  const path = join(sandbox, 'src/main.tsx');
  const original = readFileSync(path, 'utf8');

  writeFileSync(
    path,
    original.replace('const services = buildApp();', 'const renamed = buildApp();'),
  );
  expect(() => persistenceWalkthrough(sandbox)).toThrow('expected one source match');

  writeFileSync(path, original + '\nconst services = buildApp();\n');
  expect(() => persistenceWalkthrough(sandbox)).toThrow('got 2');
});

it('does not mistake comments or strings for the successful dispatch call', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'persistence-walkthrough-dispatch-'));
  temporary.push(sandbox);
  cpSync('src', join(sandbox, 'src'), { recursive: true });

  const path = join(sandbox, 'src/features/orders/ui/OrderDemo/useOrderDemo.ts');
  const source = readFileSync(path, 'utf8');
  const withoutDispatch = source.replace(
    "dispatch({ type: 'succeeded', order });",
    `// dispatch({ type: 'succeeded', order });
        void "dispatch({ type: 'succeeded', order })";`,
  );
  expect(withoutDispatch).not.toBe(source);
  writeFileSync(path, withoutDispatch);

  expect(() => persistenceWalkthrough(sandbox)).toThrow(
    'Walkthrough submit end: expected one source match in src/features/orders/ui/OrderDemo/useOrderDemo.ts, got 0',
  );
});
