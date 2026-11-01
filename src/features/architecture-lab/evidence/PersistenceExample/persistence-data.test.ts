import { describe, expect, it } from 'vitest';
import {
  persistenceVariants,
  persistenceSourceCatalog,
  persistenceSourcePaths,
} from './persistence-data';

const primaryPaths = [
  'src/features/orders/application/order-repository.ts',
  'src/features/orders/infrastructure/order-repositories/local-storage/index.ts',
  'src/features/orders/infrastructure/order-repositories/local-storage/order-storage-codec/index.ts',
  'src/app/composition.ts',
];

const legacyAdapter =
  'src/features/orders/infrastructure/local-storage-order-repository.ts';
const legacyCodec = 'src/features/orders/infrastructure/order-storage-codec.ts';

interface SelectionCase {
  name: string;
  snippets: Record<string, string>;
  expected: readonly string[];
}

const cases: readonly SelectionCase[] = [
  {
    name: 'all current sources',
    snippets: Object.fromEntries(primaryPaths.map((path) => [path, 'source'])),
    expected: primaryPaths,
  },
  {
    name: 'current wins when both versions exist',
    snippets: {
      ...Object.fromEntries(primaryPaths.map((path) => [path, 'current'])),
      [legacyAdapter]: 'legacy',
      [legacyCodec]: 'legacy',
    },
    expected: primaryPaths,
  },
  {
    name: 'empty current is still available',
    snippets: {
      [primaryPaths[1]]: '',
      [primaryPaths[2]]: '',
      [legacyAdapter]: 'legacy',
      [legacyCodec]: 'legacy',
    },
    expected: primaryPaths,
  },
  {
    name: 'legacy-only adapter and codec',
    snippets: { [legacyAdapter]: 'legacy', [legacyCodec]: 'legacy' },
    expected: [primaryPaths[0], legacyAdapter, legacyCodec, primaryPaths[3]],
  },
  {
    name: 'empty legacy is still available',
    snippets: { [legacyAdapter]: '', [legacyCodec]: '' },
    expected: [primaryPaths[0], legacyAdapter, legacyCodec, primaryPaths[3]],
  },
  {
    name: 'neither version retains the primary missing path',
    snippets: {},
    expected: primaryPaths,
  },
  {
    name: 'mixed groups keep their original positions',
    snippets: {
      [primaryPaths[0]]: '',
      [legacyAdapter]: 'legacy',
      [primaryPaths[2]]: 'current',
      [legacyCodec]: 'legacy',
    },
    expected: [primaryPaths[0], legacyAdapter, primaryPaths[2], primaryPaths[3]],
  },
];

describe('persistence example data', () => {
  it('keeps variant IDs, titles, source paths and order stable', () => {
    expect(persistenceVariants).toEqual([
      {
        id: 'persistence-coupling',
        title: 'Antes: aplicación construye el adaptador',
        path: 'fixtures/persistence-coupling/src/application/create-order.ts',
      },
      {
        id: 'persistence-injected',
        title: 'Después: aplicación recibe el contrato',
        path: 'src/features/orders/application/create-order.ts',
      },
    ]);
  });

  it('keeps the four source groups ordered as port, adapter, codec and composition', () => {
    expect(persistenceSourceCatalog.map((source) => source.currentPath)).toEqual(
      primaryPaths,
    );
    expect(persistenceSourceCatalog.map((source) => source.legacyPath)).toEqual([
      undefined,
      legacyAdapter,
      legacyCodec,
      undefined,
    ]);
  });

  it.each(cases)('selects paths with $name', ({ snippets, expected }) => {
    const original = { ...snippets };

    expect(persistenceSourcePaths(snippets)).toEqual(expected);
    expect(snippets).toEqual(original);
  });
});
