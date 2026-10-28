import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  writeFileSync,
  appendFileSync,
  symlinkSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { assertBoundaryCoverage } from './architecture-coverage';

const project = fileURLToPath(new URL('..', import.meta.url));
const boundaryRoot = 'src/features/orders';
let sandbox: string;
beforeEach(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'dependency-boundary-test-'));
  cpSync(join(project, 'src'), join(sandbox, 'src'), { recursive: true });
  for (const file of ['.dependency-cruiser.cjs', 'tsconfig.json']) {
    cpSync(join(project, file), join(sandbox, file));
  }
  symlinkSync(join(project, 'node_modules'), join(sandbox, 'node_modules'), 'dir');
});
afterEach(() => rmSync(sandbox, { recursive: true, force: true }));

function cruise(outputType = 'json') {
  const run = spawnSync(
    process.execPath,
    [
      join(project, 'node_modules/dependency-cruiser/bin/dependency-cruiser.mjs'),
      '--config',
      '.dependency-cruiser.cjs',
      '--output-type',
      outputType,
      'src',
    ],
    {
      cwd: sandbox,
      encoding: 'utf8',
      env: { ...process.env, DEPENDENCY_BOUNDARY_ROOT: boundaryRoot },
    },
  );
  if (run.error) {
    throw run.error;
  }
  return run;
}

describe('production order boundaries', () => {
  it('covers the real feature layers and excludes colocated tests', () => {
    const run = cruise();
    expect(run.status, run.stderr).toBe(0);
    const report = JSON.parse(run.stdout);
    expect(report.summary.violations).toEqual([]);
    expect(() => assertBoundaryCoverage(report.modules, boundaryRoot)).not.toThrow();
    expect(() =>
      assertBoundaryCoverage(report.modules, 'src/nonexistent-orders'),
    ).toThrow('No production modules matched');
  });

  it('rejects an actual import injected into the moved production domain', () => {
    // Mutate only a disposable copy; the real source and shipped fixtures stay unchanged.
    writeFileSync(
      join(sandbox, boundaryRoot, 'ui/architecture-probe.ts'),
      'export const display = "probe";\n',
    );
    appendFileSync(
      join(sandbox, boundaryRoot, 'domain/order.ts'),
      '\nimport { display } from "../ui/architecture-probe";\nexport const architectureProbe = display;\n',
    );
    const run = cruise();
    expect(run.status, run.stderr).toBe(0);
    const report = JSON.parse(run.stdout);
    expect(
      report.summary.violations.map(
        ({ from, to, rule }: { from: string; to: string; rule: { name: string } }) => ({
          from,
          to,
          rule: rule.name,
        }),
      ),
    ).toEqual([
      {
        from: `${boundaryRoot}/domain/order.ts`,
        to: `${boundaryRoot}/ui/architecture-probe.ts`,
        rule: 'no-domain-outward',
      },
    ]);
    expect(cruise('err').status).toBe(1);
  });
  it.each([
    {
      owner: 'architecture-lab',
      target: 'src/features/architecture-lab/evidence',
      importPath: '../../architecture-lab/evidence/architecture-probe',
      typeOnly: true,
    },
    {
      owner: 'app',
      target: 'src/app',
      importPath: '../../../app/architecture-probe',
      typeOnly: false,
    },
  ])('rejects an application import into $owner', ({ target, importPath, typeOnly }) => {
    mkdirSync(join(sandbox, target), { recursive: true });
    writeFileSync(
      join(sandbox, target, 'architecture-probe.ts'),
      'export interface ViewProbe { value: string }\nexport const viewProbe = "probe";\n',
    );
    const injection = typeOnly
      ? `\nimport type { ViewProbe } from "${importPath}";\nexport type ArchitectureProbe = ViewProbe;\n`
      : `\nimport { viewProbe } from "${importPath}";\nexport const architectureProbe = viewProbe;\n`;
    appendFileSync(join(sandbox, boundaryRoot, 'application/create-order.ts'), injection);
    const run = cruise();
    expect(run.status, run.stderr).toBe(0);
    const report = JSON.parse(run.stdout);
    expect(
      report.summary.violations.map(
        ({ from, to, rule }: { from: string; to: string; rule: { name: string } }) => ({
          from,
          to,
          rule: rule.name,
        }),
      ),
    ).toEqual([
      {
        from: `${boundaryRoot}/application/create-order.ts`,
        to: `${target}/architecture-probe.ts`,
        rule: 'no-application-outward',
      },
    ]);
    expect(cruise('err').status).toBe(1);
  });
});
