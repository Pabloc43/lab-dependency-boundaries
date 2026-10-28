import { describe, expect, it } from 'vitest';
import { deriveCyclePath } from './cycle-path';
const violation = {
  from: 'a.ts',
  to: 'b.ts',
  rule: { name: 'no-circular' },
  cycle: [{ name: 'b.ts' }, { name: 'a.ts' }],
};
const modules = [
  { source: 'a.ts', dependencies: [{ resolved: 'b.ts' }] },
  { source: 'b.ts', dependencies: [{ resolved: 'a.ts' }] },
];
describe('cycle evidence', () => {
  it('derives the full closed path from metadata and verified edges', () =>
    expect(deriveCyclePath(violation, modules)).toEqual(['a.ts', 'b.ts', 'a.ts']));
  it('rejects missing metadata', () =>
    expect(() => deriveCyclePath({ ...violation, cycle: undefined }, modules)).toThrow(
      'Missing complete',
    ));
  it('rejects metadata without the return edge', () =>
    expect(() =>
      deriveCyclePath(
        { ...violation, cycle: [{ name: 'b.ts' }, { name: 'c.ts' }] },
        modules,
      ),
    ).toThrow('return'));
  it('rejects a different starting target', () =>
    expect(() =>
      deriveCyclePath(
        { ...violation, cycle: [{ name: 'c.ts' }, { name: 'a.ts' }] },
        modules,
      ),
    ).toThrow('target'));
  it('rejects a claimed edge absent from the actual graph', () =>
    expect(() =>
      deriveCyclePath(violation, [modules[0], { source: 'b.ts', dependencies: [] }]),
    ).toThrow('Unverified cycle edge'));
  it('does not accept a different rule as cycle evidence', () =>
    expect(() =>
      deriveCyclePath({ ...violation, rule: { name: 'no-domain-outward' } }, modules),
    ).toThrow());
});
