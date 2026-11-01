import { afterEach, beforeEach, expect, it } from 'vitest';
import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
// @ts-expect-error The report command is a plain ESM script shared with Node.
import { generateArchitectureReport, nativeFormatterStatus } from './index.mjs';

const project = fileURLToPath(new URL('../../..', import.meta.url));
let sandbox: string;

beforeEach(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'architecture-report-'));

  for (const path of [
    'src',
    'scripts',
    'fixtures',
    '.dependency-cruiser.cjs',
    'tsconfig.json',
  ]) {
    cpSync(join(project, path), join(sandbox, path), { recursive: true });
  }

  symlinkSync(join(project, 'node_modules'), join(sandbox, 'node_modules'), 'dir');
  writeFileSync(join(sandbox, 'package.json'), '{"type":"module"}');
});

afterEach(() => rmSync(sandbox, { recursive: true, force: true }));

const output = (file: string) => join(sandbox, 'reports/architecture', file);
const read = (file: string) => readFileSync(output(file), 'utf8');
const generate = (extra = {}) =>
  generateArchitectureReport({
    project: sandbox,
    summaryPath: join(sandbox, 'step-summary.md'),
    ...extra,
  });

it('produces native HTML, raw JSON and an accurate production-only summary', () => {
  expect(generate()).toEqual({ exitCode: 0, violationCount: 0 });

  const report = JSON.parse(read('architecture.json'));
  expect(report.summary.violations).toEqual([]);
  expect(
    report.modules.some((module: { source: string }) =>
      module.source.startsWith('src/features/orders/domain/'),
    ),
  ).toBe(true);
  expect(
    report.modules.every(
      (module: { source: string }) =>
        !module.source.startsWith('fixtures/') && !module.source.includes('.test.'),
    ),
  ).toBe(true);

  const html = read('architecture.html');
  expect(html).toContain('<html');

  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map(
    (match) => match[1],
  );

  for (const rule of report.summary.ruleSetUsed.forbidden) {
    expect(rule.comment).toEqual(expect.any(String));
    expect(rule.comment.length).toBeGreaterThan(20);

    const row = rows.find((content) => content.includes(`href="#${rule.name}-instance"`));
    expect(row).toBeDefined();

    const cells = [...(row ?? '').matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)];
    expect(cells).toHaveLength(6);

    const explanation = cells[5][1].trim();
    expect(explanation).toBe(rule.comment);
    expect(explanation).not.toBe('undefined');
  }

  expect(read('summary.md')).toContain('Sin errores arquitectónicos');
  expect(read('summary.md')).toContain(
    '| Módulos | Dependencias | Errores | Avisos | Información |',
  );

  const { totalCruised, totalDependenciesCruised, error, warn, info } = report.summary;
  expect(read('summary.md')).toContain(
    `| ${totalCruised} | ${totalDependenciesCruised} | ${error} | ${warn} | ${info} |`,
  );
  expect(read('summary.md')).toContain('dependency-cruiser');
  expect(read('summary.md')).toContain('Commit:');
  expect(read('summary.md')).toContain(
    'Los fixtures incorrectos no están en este informe',
  );
  expect(readFileSync(join(sandbox, 'step-summary.md'), 'utf8')).toBe(read('summary.md'));
});

// This integration starts real CLI and formatter processes on shared CI runners.
it(
  'renders real production violations without turning the existing gate green',
  { timeout: 30_000 },
  () => {
    writeFileSync(
      join(sandbox, 'src/features/orders/ui/report-probe.ts'),
      'export const notice = "probe";\n',
    );
    appendFileSync(
      join(sandbox, 'src/features/orders/domain/order.ts'),
      '\nexport { notice } from "../ui/report-probe";\n',
    );
    expect(generate()).toEqual({ exitCode: 1, violationCount: 1 });
    expect(read('architecture.html')).toContain('no-domain-outward');
    expect(read('summary.md')).toContain('Hay errores arquitectónicos');
    expect(read('summary.md')).toContain('**1**');

    const gate = spawnSync(
      process.execPath,
      [join(sandbox, 'scripts/architecture/index.mjs')],
      {
        cwd: sandbox,
        encoding: 'utf8',
        timeout: 15_000,
      },
    );
    expect(gate.error).toBeUndefined();
    expect(gate.status).toBe(1);
    expect(gate.stderr).toContain('Unexpected rules for valid');
  },
);

it('fails on broken configuration and removes stale reports instead of implying zero errors', () => {
  mkdirSync(output(''), { recursive: true });
  writeFileSync(output('architecture.html'), 'stale HTML');
  writeFileSync(output('architecture.json'), 'stale JSON');
  writeFileSync(
    join(sandbox, '.dependency-cruiser.cjs'),
    'throw new Error("broken configuration");',
  );
  expect(() => generate()).toThrow('Architecture JSON analysis failed');
  expect(existsSync(output('architecture.html'))).toBe(false);
  expect(existsSync(output('architecture.json'))).toBe(false);
  expect(read('summary.md')).toContain('No hay un resultado diagnóstico completo');
  expect(read('summary.md')).not.toContain('Sin errores arquitectónicos');
  expect(read('diagnostic.txt')).toContain('broken configuration');

  const cli = spawnSync(
    process.execPath,
    [join(project, 'scripts/architecture/report/index.mjs')],
    {
      cwd: sandbox,
      encoding: 'utf8',
      env: { ...process.env, GITHUB_STEP_SUMMARY: join(sandbox, 'cli-summary.md') },
    },
  );
  expect(cli.status).toBe(1);
  expect(existsSync(output('architecture.html'))).toBe(false);
});

it('fails when native HTML formatting fails, retaining only current diagnostic evidence', () => {
  const formatterPath = join(sandbox, 'failing-formatter.mjs');
  const nativeFormatter = join(
    project,
    'node_modules/dependency-cruiser/bin/depcruise-fmt.mjs',
  );

  writeFileSync(
    formatterPath,
    `if (process.argv.includes('err-html')) { console.error('formatter unavailable'); process.exit(2); } await import(${JSON.stringify(pathToFileURL(nativeFormatter).href)});`,
  );
  expect(() => generate({ formatterPath })).toThrow('Native HTML formatter failed');
  expect(existsSync(output('architecture.html'))).toBe(false);
  expect(JSON.parse(read('architecture.json')).summary.violations).toEqual([]);
  expect(read('summary.md')).toContain('No se pudo generar el informe');
  expect(read('diagnostic.txt')).toContain('formatter unavailable');
});

it('handles multiple real production errors using native count exits', () => {
  for (const name of ['first', 'second']) {
    writeFileSync(
      join(sandbox, `src/features/orders/ui/${name}.ts`),
      `export const ${name} = 1;`,
    );
    appendFileSync(
      join(sandbox, 'src/features/orders/domain/order.ts'),
      `\nexport { ${name} } from "../ui/${name}";\n`,
    );
  }

  expect(generate()).toEqual({ exitCode: 2, violationCount: 2 });
  const canonical = JSON.parse(read('architecture-formatted.json'));
  expect(canonical.summary.error).toBe(2);
  expect(read('summary.md')).toContain('Hay errores arquitectónicos');
  expect(read('architecture.html')).toContain('no-domain-outward');
});

it('keeps raw cycle analysis and uses native normalized counts for all rendered reports', () => {
  mkdirSync(join(sandbox, 'src/report-cycle'), { recursive: true });
  writeFileSync(
    join(sandbox, 'src/report-cycle/a.ts'),
    'export { b } from "./b"; export const a = 1;',
  );
  writeFileSync(
    join(sandbox, 'src/report-cycle/b.ts'),
    'export { a } from "./a"; export const b = 1;',
  );

  const result = generate();
  const raw = JSON.parse(read('architecture.json'));
  const canonical = JSON.parse(read('architecture-formatted.json'));
  expect(raw.summary.error).toBeGreaterThan(0);
  expect(canonical.summary.error).toBeGreaterThan(0);
  expect(result.exitCode).toBe(canonical.summary.advisedExitCode % 256);
  expect(result.violationCount).toBe(canonical.summary.violations.length);
  const { totalCruised, totalDependenciesCruised, error, warn, info } = canonical.summary;
  expect(read('summary.md')).toContain(
    `| ${totalCruised} | ${totalDependenciesCruised} | ${error} | ${warn} | ${info} |`,
  );
  expect(read('summary.md')).toContain('Al resumir ciclos');
  expect(read('architecture.html')).toContain('no-circular');
});

it('does not accept a formatter failure whose exit happens to equal the error count', () => {
  for (const name of ['first', 'second']) {
    writeFileSync(
      join(sandbox, `src/features/orders/ui/${name}.ts`),
      `export const ${name} = 1;`,
    );
    appendFileSync(
      join(sandbox, 'src/features/orders/domain/order.ts'),
      `\nexport { ${name} } from "../ui/${name}";\n`,
    );
  }
  const formatterPath = join(sandbox, 'failing-error-formatter.mjs');
  const native = pathToFileURL(
    join(project, 'node_modules/dependency-cruiser/bin/depcruise-fmt.mjs'),
  ).href;
  writeFileSync(
    formatterPath,
    `if (process.argv.includes('err')) { console.error('formatter crashed'); process.exit(2); } await import(${JSON.stringify(native)});`,
  );

  expect(() => generate({ formatterPath })).toThrow('Native error formatter failed');
  expect(existsSync(output('architecture.html'))).toBe(false);
  expect(read('summary.md')).toContain('No hay un resultado diagnóstico completo');
});

it('rejects broken native JSON formatting and clears a previous HTML report', () => {
  generate();
  const formatterPath = join(sandbox, 'invalid-json-formatter.mjs');
  writeFileSync(formatterPath, "console.log('{}');");

  expect(() => generate({ formatterPath })).toThrow();
  expect(existsSync(output('architecture.html'))).toBe(false);
  expect(read('summary.md')).toContain('No hay un resultado diagnóstico completo');
});

it('validates native count exits including POSIX wrapping without treating errors as green', () => {
  expect(nativeFormatterStatus({ error: 2, advisedExitCode: 2 }, 2)).toBe(2);
  expect(nativeFormatterStatus({ error: 256, advisedExitCode: 256 }, 0)).toBe(1);
  expect(nativeFormatterStatus({ error: 0, advisedExitCode: 0 }, 0)).toBe(0);
  expect(() => nativeFormatterStatus({ error: 2, advisedExitCode: 2 }, 1)).toThrow(
    'canonical JSON',
  );
  expect(() => nativeFormatterStatus({ error: 1, advisedExitCode: 0 }, 0)).toThrow(
    'canonical JSON',
  );
});
