import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertBoundaryCoverage } from './architecture-coverage.ts';

const scope = 'src';
const boundaryRoot = 'src/features/orders';

function runTool(project, binary, args) {
  const run = spawnSync(process.execPath, [binary, ...args], {
    cwd: project,
    encoding: 'utf8',
    timeout: 60_000,
    maxBuffer: 10 * 1024 * 1024,
    env: { ...process.env, DEPENDENCY_BOUNDARY_ROOT: boundaryRoot },
  });
  if (run.error) {
    throw run.error;
  }
  return run;
}

function checkedOutput(run, label) {
  if (run.status !== 0) {
    throw new Error(`${label} failed (exit ${run.status}): ${run.stderr || run.stdout}`);
  }
  return run.stdout;
}

function reportContext(project) {
  const version = JSON.parse(
    readFileSync(join(project, 'node_modules/dependency-cruiser/package.json'), 'utf8'),
  ).version;
  const git = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: project,
    encoding: 'utf8',
    timeout: 10_000,
    maxBuffer: 64 * 1024,
  });
  const sha =
    process.env.GITHUB_SHA ||
    (git.status === 0
      ? git.stdout.trim()
      : 'No disponible: copia local sin metadatos Git');
  return { version, sha };
}

function introduction({ version, sha }) {
  return [
    '## Informe de arquitectura · código productivo',
    '',
    `- Alcance: \`${scope}\`; fronteras de capas: \`${boundaryRoot}\`.`,
    '- Los tests co-localizados se excluyen según la configuración del proyecto.',
    `- Commit: \`${sha}\`.`,
    `- Herramienta: dependency-cruiser \`${version}\`.`,
    '- Los fixtures incorrectos no están en este informe. Se validan por separado con `pnpm architecture`.',
  ];
}

function summaryFor(report, context, exitCode) {
  const violations = report.summary.violations;
  const lines = introduction(context);
  lines.push(
    '',
    exitCode === 0
      ? '**Sin errores arquitectónicos en el alcance analizado.**'
      : '**Hay errores arquitectónicos en el código productivo.**',
    '',
    `- Salida nativa de \`depcruise-fmt -T err --exit-code\`: **${exitCode}**.`,
    '',
    '| Módulos | Dependencias | Errores | Avisos | Información |',
    '| ---: | ---: | ---: | ---: | ---: |',
    `| ${report.summary.totalCruised} | ${report.summary.totalDependenciesCruised} | ${report.summary.error} | ${report.summary.warn} | ${report.summary.info} |`,
    '',
    `- Infracciones reportadas (todos los niveles): **${violations.length}**.`,
    '',
    'El informe es diagnóstico: no sustituye `pnpm check` ni modifica el resultado de sus gates.',
    'Descarga el artifact **architecture-report**, descomprímelo y abre `architecture.html`. `architecture.json` conserva el informe original y `architecture.txt` la salida nativa de consola.',
  );
  if (violations.length > 0) {
    lines.push('', '<details><summary>Primeras infracciones (máximo 20)</summary>', '');
    for (const violation of violations.slice(0, 20)) {
      lines.push(
        `- \`${violation.rule.severity}: ${violation.rule.name}\` · \`${violation.from}\` → \`${violation.to}\``,
      );
    }
    lines.push('', '</details>');
  }
  return lines.join('\n') + '\n';
}

// One analysis, two native formatters. Violations belong to the existing gate;
// invalid reports or formatter failures make this diagnostic command fail too.
export function generateArchitectureReport({
  project = process.cwd(),
  formatterPath,
  summaryPath = process.env.GITHUB_STEP_SUMMARY,
} = {}) {
  const output = join(project, 'reports/architecture');
  rmSync(output, { recursive: true, force: true });
  mkdirSync(output, { recursive: true });
  let context = {
    version: 'No disponible',
    sha: process.env.GITHUB_SHA || 'No disponible',
  };
  try {
    context = reportContext(project);
    const binaryDirectory = join(project, 'node_modules/dependency-cruiser/bin');
    const analysis = runTool(project, join(binaryDirectory, 'dependency-cruiser.mjs'), [
      '--config',
      '.dependency-cruiser.cjs',
      '--output-type',
      'json',
      scope,
    ]);
    const raw = checkedOutput(analysis, 'Architecture JSON analysis');
    const report = JSON.parse(raw);
    assertBoundaryCoverage(report.modules, boundaryRoot);
    const counters = [
      'totalCruised',
      'totalDependenciesCruised',
      'error',
      'warn',
      'info',
    ];
    if (
      !Array.isArray(report.summary?.violations) ||
      counters.some(
        (field) =>
          !Number.isSafeInteger(report.summary[field]) || report.summary[field] < 0,
      )
    ) {
      throw new Error('Invalid architecture report summary');
    }
    const jsonPath = join(output, 'architecture.json');
    writeFileSync(jsonPath, raw);
    const formatter = formatterPath || join(binaryDirectory, 'depcruise-fmt.mjs');
    const errors = runTool(project, formatter, ['-T', 'err', '--exit-code', jsonPath]);
    if (errors.status !== 0 && errors.status !== 1) {
      throw new Error(`Native error formatter failed: ${errors.stderr || errors.stdout}`);
    }
    const hasErrors = report.summary.violations.some(
      ({ rule }) => rule.severity === 'error',
    );
    if (errors.status !== Number(hasErrors)) {
      throw new Error('Native formatter exit does not match the JSON violation severity');
    }
    const html = checkedOutput(
      runTool(project, formatter, ['-T', 'err-html', jsonPath]),
      'Native HTML formatter',
    );
    if (!html.trim()) {
      throw new Error('Native HTML formatter returned empty output');
    }
    writeFileSync(join(output, 'architecture.html'), html);
    writeFileSync(join(output, 'architecture.txt'), errors.stdout);
    const summary = summaryFor(report, context, errors.status);
    writeFileSync(join(output, 'summary.md'), summary);
    if (summaryPath) {
      appendFileSync(summaryPath, summary);
    }
    console.log(
      `Architecture report: ${report.summary.violations.length} production violations; native exit ${errors.status}. Files: reports/architecture/`,
    );
    return { exitCode: errors.status, violationCount: report.summary.violations.length };
  } catch (cause) {
    // Never leave an HTML file from a previous or incomplete attempt behind.
    rmSync(join(output, 'architecture.html'), { force: true });
    const diagnostic = cause instanceof Error ? cause.message : String(cause);
    writeFileSync(join(output, 'diagnostic.txt'), diagnostic + '\n');
    const summary =
      [
        ...introduction(context),
        '',
        '**No se pudo generar el informe. No hay un resultado diagnóstico completo.**',
        '',
        'Consulta `diagnostic.txt` en el artifact **architecture-report**. Este fallo no significa que existan cero infracciones.',
      ].join('\n') + '\n';
    writeFileSync(join(output, 'summary.md'), summary);
    if (summaryPath) {
      appendFileSync(summaryPath, summary);
    }
    throw cause;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  generateArchitectureReport();
}
