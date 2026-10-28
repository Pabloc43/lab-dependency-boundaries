import { spawnSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { assertBoundaryCoverage } from './architecture-coverage.ts';
import { deriveCyclePath } from './cycle-path.ts';
import { createCodeHighlighter } from './highlight.ts';
const scenarios = [
  {
    id: 'valid',
    scanRoot: 'src',
    boundaryRoot: 'src/features/orders',
    expectedRules: [],
  },
  {
    id: 'domain-to-ui',
    scanRoot: 'fixtures/domain-to-ui/src',
    boundaryRoot: 'fixtures/domain-to-ui/src',
    expectedRules: ['no-domain-outward'],
  },
  {
    id: 'cycle',
    scanRoot: 'fixtures/cycle/src',
    boundaryRoot: 'fixtures/cycle/src',
    expectedRules: ['no-circular'],
  },
];
const results = scenarios.map(({ id, scanRoot, boundaryRoot, expectedRules }) => {
  const reportRun = spawnSync(
    process.execPath,
    [
      'node_modules/dependency-cruiser/bin/dependency-cruiser.mjs',
      '--config',
      '.dependency-cruiser.cjs',
      '--output-type',
      'json',
      scanRoot,
    ],
    { encoding: 'utf8', env: { ...process.env, DEPENDENCY_BOUNDARY_ROOT: boundaryRoot } },
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
      scanRoot,
    ],
    { encoding: 'utf8', env: { ...process.env, DEPENDENCY_BOUNDARY_ROOT: boundaryRoot } },
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
  if (id === 'valid') {
    assertBoundaryCoverage(report.modules, boundaryRoot);
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
    assert.equal(violations[0].from, `${boundaryRoot}/domain/order.ts`);
    assert.equal(violations[0].to, `${boundaryRoot}/ui/toast.ts`);
  }
  if (id === 'cycle') {
    assert.ok(violations.length > 0);
    for (const violation of violations) {
      assert.ok(
        [`${boundaryRoot}/domain/a.ts`, `${boundaryRoot}/domain/b.ts`].includes(
          violation.from,
        ),
      );
      assert.ok(
        [`${boundaryRoot}/domain/a.ts`, `${boundaryRoot}/domain/b.ts`].includes(
          violation.to,
        ),
      );
      assert.ok(violation.cycle.length >= 2);
    }
  }
  console.log(`${id}: ${violations.length} expected violations; exit ${run.status}`);
  return {
    id,
    exitCode: run.status,
    moduleCount: report.summary.totalCruised,
    violations: violations.map((violation) => ({
      from: violation.from,
      to: violation.to,
      rule: violation.rule.name,
      ...(violation.rule.name === 'no-circular'
        ? { cyclePath: deriveCyclePath(violation, report.modules) }
        : {}),
    })),
  };
});
const snippets = Object.fromEntries(
  [
    'src/features/orders/application/create-order.ts',
    'src/features/orders/domain/order.ts',
    'fixtures/domain-to-ui/src/domain/order.ts',
    '.dependency-cruiser.cjs',
    'fixtures/cycle/src/domain/a.ts',
    'fixtures/cycle/src/domain/b.ts',
  ].map((file) => [file, readFileSync(file, 'utf8')]),
);
const highlighter = await createCodeHighlighter();
const highlightedSnippets = Object.fromEntries(
  Object.entries(snippets).map(([file, source]) => [
    file,
    highlighter.highlight(source, file.endsWith('.cjs') ? 'javascript' : 'typescript'),
  ]),
);
const highlightedReports = Object.fromEntries(
  results.map(({ id, violations }) => [
    id,
    highlighter.highlight(JSON.stringify(violations, null, 2), 'json'),
  ]),
);
highlighter.dispose();
mkdirSync('public', { recursive: true });
writeFileSync(
  'public/evidence.json',
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      tool: 'dependency-cruiser',
      results,
      snippets,
      highlightedSnippets,
      highlightedReports,
    },
    null,
    2,
  ) + '\n',
);
