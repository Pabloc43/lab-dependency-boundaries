import { spawnSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const scenarios = [
  { id: 'valid', root: 'src', expectedRules: [] },
  {
    id: 'domain-to-ui',
    root: 'fixtures/domain-to-ui/src',
    expectedRules: ['no-domain-outward'],
  },
  { id: 'cycle', root: 'fixtures/cycle/src', expectedRules: ['no-circular'] },
];
const results = scenarios.map(({ id, root, expectedRules }) => {
  const reportRun = spawnSync(
    process.execPath,
    [
      'node_modules/dependency-cruiser/bin/dependency-cruiser.mjs',
      '--config',
      '.dependency-cruiser.cjs',
      '--output-type',
      'json',
      root,
    ],
    { encoding: 'utf8', env: { ...process.env, DEPENDENCY_ROOT: root } },
  );
  if (reportRun.error) {
    throw reportRun.error;
  }
  assert.equal(
    reportRun.status,
    0,
    `Report generation failed for ${id}: ${reportRun.stderr}`,
  );
  // The JSON reporter does not fail on rule violations; verify the err reporter too.
  const run = spawnSync(
    process.execPath,
    [
      'node_modules/dependency-cruiser/bin/dependency-cruiser.mjs',
      '--config',
      '.dependency-cruiser.cjs',
      '--output-type',
      'err',
      root,
    ],
    { encoding: 'utf8', env: { ...process.env, DEPENDENCY_ROOT: root } },
  );
  if (run.error) {
    throw run.error;
  }
  assert.ok(
    run.status === 0 || run.status === 1,
    `Unexpected exit for ${id}: ${run.stderr}`,
  );
  let report;
  try {
    report = JSON.parse(reportRun.stdout);
  } catch {
    throw new Error(`Invalid report for ${id}: ${reportRun.stderr}`);
  }
  const violations = report.summary.violations;
  const actualRules = [...new Set(violations.map((item) => item.rule.name))].sort();
  assert.deepEqual(actualRules, expectedRules, `Unexpected rules for ${id}`);
  assert.equal(
    run.status,
    expectedRules.length ? 1 : 0,
    `Unexpected exit status for ${id}`,
  );
  if (id === 'domain-to-ui') {
    assert.equal(violations.length, 1);
    assert.equal(violations[0].from, `${root}/domain/order.ts`);
    assert.equal(violations[0].to, `${root}/ui/toast.ts`);
  }
  if (id === 'cycle') {
    assert.ok(violations.length > 0);
    for (const violation of violations) {
      assert.ok([`${root}/domain/a.ts`, `${root}/domain/b.ts`].includes(violation.from));
      assert.ok([`${root}/domain/a.ts`, `${root}/domain/b.ts`].includes(violation.to));
      assert.ok(violation.cycle.length >= 2);
    }
  }
  console.log(`${id}: ${violations.length} expected violations; exit ${run.status}`);
  return {
    id,
    exitCode: run.status,
    moduleCount: report.summary.totalCruised,
    violations: violations.map(({ from, to, rule }) => ({ from, to, rule: rule.name })),
  };
});
const snippets = Object.fromEntries(
  [
    'src/application/create-order.ts',
    'src/domain/order.ts',
    'fixtures/domain-to-ui/src/domain/order.ts',
    '.dependency-cruiser.cjs',
  ].map((file) => [file, readFileSync(file, 'utf8')]),
);
mkdirSync('public', { recursive: true });
writeFileSync(
  'public/evidence.json',
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      tool: 'dependency-cruiser',
      results,
      snippets,
    },
    null,
    2,
  ) + '\n',
);
