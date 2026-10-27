import assert from 'node:assert/strict';

interface Violation {
  from: string;
  to: string;
  rule: { name: string };
  cycle?: readonly { name: string }[];
}
interface Module {
  source: string;
  dependencies: readonly { resolved: string }[];
}

export function deriveCyclePath(
  violation: Violation,
  modules: readonly Module[],
): string[] {
  assert.equal(violation.rule.name, 'no-circular');
  assert.ok(
    violation.cycle && violation.cycle.length >= 2,
    'Missing complete cycle metadata',
  );
  const names = violation.cycle.map(({ name }) => name);
  assert.ok(names.every((name) => typeof name === 'string' && name.length > 0));
  assert.equal(
    names[0],
    violation.to,
    'Cycle must start at the reported dependency target',
  );
  assert.equal(names.at(-1), violation.from, 'Cycle must return to the reported source');
  const path = [violation.from, ...names];
  assert.equal(
    new Set(path.slice(0, -1)).size,
    path.length - 1,
    'Cycle repeats an interior node',
  );
  for (let index = 0; index < path.length - 1; index += 1) {
    const source = modules.find((module) => module.source === path[index]);
    assert.ok(
      source?.dependencies.some(({ resolved }) => resolved === path[index + 1]),
      `Unverified cycle edge: ${path[index]} -> ${path[index + 1]}`,
    );
  }
  return path;
}
