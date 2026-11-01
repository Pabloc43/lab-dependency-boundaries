import { describe, expect, it } from 'vitest';
import type { Evidence } from '../evidence.types';
import { exampleOptions, exampleSourcePath, type ExampleId } from './example-options';

const current = 'src/features/orders/application/create-order.ts';
const legacy = 'src/application/create-order.ts';
const fixture = 'fixtures/domain-to-ui/src/domain/order.ts';

type SnippetEvidence = Pick<Evidence, 'snippets'> | null;

interface FixtureCase {
  name: string;
  evidence: SnippetEvidence;
}

interface SourceCase extends FixtureCase {
  path: string;
}

const domainCases: readonly FixtureCase[] = [
  { name: 'no evidence', evidence: null },
  { name: 'missing fixture', evidence: { snippets: { [current]: 'current' } } },
  {
    name: 'both use cases',
    evidence: { snippets: { [current]: 'current', [legacy]: 'legacy' } },
  },
  { name: 'empty fixture', evidence: { snippets: { [fixture]: '' } } },
];

const sourceCases: readonly SourceCase[] = [
  {
    name: 'current source',
    evidence: { snippets: { [current]: 'current' } },
    path: current,
  },
  {
    name: 'current wins over legacy',
    evidence: { snippets: { [current]: 'current', [legacy]: 'legacy' } },
    path: current,
  },
  {
    name: 'empty current still counts',
    evidence: { snippets: { [current]: '', [legacy]: 'legacy' } },
    path: current,
  },
  {
    name: 'legacy-only source',
    evidence: { snippets: { [legacy]: 'legacy' } },
    path: legacy,
  },
  { name: 'empty legacy source', evidence: { snippets: { [legacy]: '' } }, path: legacy },
  { name: 'missing both sources', evidence: { snippets: {} }, path: legacy },
  { name: 'no evidence', evidence: null, path: legacy },
];

describe('evidence example selection', () => {
  it('keeps the button order and labels stable', () => {
    expect(exampleOptions).toEqual([
      { id: 'domain-to-ui', label: 'Import incorrecto' },
      { id: 'cycle', label: 'Dependencia circular' },
      { id: 'valid', label: 'Aplicación válida' },
      { id: 'persistence-coupling', label: 'Persistencia acoplada' },
    ]);
  });

  it.each(domainCases)('prioritizes the domain fixture with $name', ({ evidence }) => {
    expect(exampleSourcePath('domain-to-ui', evidence)).toBe(fixture);
  });

  const nonDomainExamples: readonly ExampleId[] = [
    'valid',
    'cycle',
    'persistence-coupling',
  ];

  for (const example of nonDomainExamples) {
    it.each(sourceCases)(
      `selects the source key exactly for ${example}: $name`,
      ({ evidence, path }) => {
        expect(exampleSourcePath(example, evidence)).toBe(path);
      },
    );
  }
});
