import assert from 'node:assert/strict';

export function assertBoundaryCoverage(
  modules: readonly { source: string }[],
  boundaryRoot: string,
) {
  const layers = ['domain', 'application', 'infrastructure', 'ui'];
  for (const layer of layers) {
    assert.ok(
      modules.some(({ source }) => source.startsWith(`${boundaryRoot}/${layer}/`)),
      `No production modules matched ${boundaryRoot}/${layer}/`,
    );
  }
  assert.ok(
    modules.every(({ source }) => !/[.]test[.](ts|tsx|js|mjs)$/.test(source)),
    'Production analysis must not include colocated test files',
  );
}
