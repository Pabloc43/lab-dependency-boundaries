import { expect, it } from 'vitest';
import { isEvidence } from './evidence-validation';

const base = { generatedAt: '2026-11-01T12:00:00Z', results: [], snippets: {} };
const result = { id: 'valid', exitCode: 0, moduleCount: 1, violations: [] };
const code = { source: '', language: 'typescript', lines: [{ tokens: [], ending: '' }] };
const excerpt = {
  id: 'bootstrap',
  path: 'historical/main.tsx',
  source: '',
  start: 0,
  end: 0,
  startLine: 1,
  endLine: 1,
  startColumn: 1,
  endColumn: 1,
};

it('accepts historical omissions, missing results, unknown IDs and empty sources without inventing data', () => {
  expect(isEvidence(base)).toBe(true);
  expect(
    isEvidence({
      ...base,
      snippets: { current: '', legacy: 'text' },
      results: [{ ...result, id: 'historical-example' }],
      extra: true,
    }),
  ).toBe(true);
});

it('accepts all currently consumed optional structures', () => {
  expect(
    isEvidence({
      ...base,
      results: [
        {
          ...result,
          verification: {
            typecheck: true,
            saveRecoverClear: true,
            isolatedCopies: ['source.ts'],
          },
          violations: [
            {
              from: 'a.ts',
              to: 'b.ts',
              rule: 'no-circular',
              cyclePath: ['a.ts', 'b.ts', 'a.ts'],
            },
          ],
        },
      ],
      highlightedSnippets: { current: code },
      highlightedReports: { cycle: code },
      walkthrough: [{ ...excerpt, code }],
    }),
  ).toBe(true);
});

it.each([
  null,
  [],
  3,
  {},
  { ...base, generatedAt: 'not a date' },
  { ...base, results: null },
  { ...base, snippets: null },
  { ...base, snippets: { source: 3 } },
  { ...base, results: [{ ...result, violations: {} }] },
  { ...base, results: [{ ...result, moduleCount: -1 }] },
  { ...base, results: [{ ...result, exitCode: 0.5 }] },
  { ...base, results: [{ ...result, violations: [null] }] },
  { ...base, results: [{ ...result, verification: {} }] },
])(
  'rejects malformed required data without trusting a TypeScript assertion: %j',
  (value) => {
    expect(isEvidence(value)).toBe(false);
  },
);

it.each([
  {
    highlightedSnippets: { current: { ...code, lines: [{ tokens: null, ending: '' }] } },
  },
  { highlightedReports: { cycle: { ...code, language: 'unknown' } } },
  {
    highlightedSnippets: {
      current: {
        ...code,
        lines: [{ tokens: [{ content: 3, color: '#fff' }], ending: '' }],
      },
    },
  },
  { walkthrough: [null] },
  { walkthrough: [{ ...excerpt, startLine: 0 }] },
  { walkthrough: [{ ...excerpt, code: null }] },
])(
  'rejects present malformed optional structures instead of crashing their consumers: %j',
  (optional) => {
    expect(isEvidence({ ...base, ...optional })).toBe(false);
  },
);

it('keeps mismatched but structurally valid tokens eligible for the existing raw-source fallback', () => {
  expect(
    isEvidence({
      ...base,
      snippets: { current: 'actual source' },
      highlightedSnippets: { current: code },
    }),
  ).toBe(true);
});
