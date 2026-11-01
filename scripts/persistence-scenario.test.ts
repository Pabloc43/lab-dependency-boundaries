import { expect, it } from 'vitest';
// @ts-expect-error The build harness is a plain ESM script, intentionally shared with Node.
import { verifyPersistenceScenario } from './persistence-scenario.mjs';
it('compiles and runs the same persistence behavior before and after dependency injection', () => {
  const { results, snippets } = verifyPersistenceScenario();
  expect(results.map((item: { exitCode: number }) => item.exitCode)).toEqual([1, 0]);
  for (const result of results) {
    expect(result.verification).toMatchObject({
      typecheck: true,
      saveRecoverClear: true,
    });
  }
  expect(
    snippets['fixtures/persistence-coupling/src/application/create-order.ts'],
  ).toContain('new LocalStorageOrderRepository');
}, 20000);
