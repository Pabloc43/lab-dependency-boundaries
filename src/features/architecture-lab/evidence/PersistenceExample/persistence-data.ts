interface PersistenceVariant {
  readonly id: 'persistence-coupling' | 'persistence-injected';
  readonly title: string;
  readonly path: string;
}

export const persistenceVariants: readonly PersistenceVariant[] = [
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
];

interface PersistenceSource {
  readonly currentPath: string;
  readonly legacyPath?: string;
}

export const persistenceSourceCatalog: readonly PersistenceSource[] = [
  { currentPath: 'src/features/orders/application/order-repository.ts' },
  {
    currentPath:
      'src/features/orders/infrastructure/order-repositories/local-storage/index.ts',
    legacyPath: 'src/features/orders/infrastructure/local-storage-order-repository.ts',
  },
  {
    currentPath:
      'src/features/orders/infrastructure/order-repositories/local-storage/order-storage-codec/index.ts',
    legacyPath: 'src/features/orders/infrastructure/order-storage-codec.ts',
  },
  { currentPath: 'src/app/composition.ts' },
];

export function persistenceSourcePaths(
  snippets: Readonly<Record<string, string>>,
): readonly string[] {
  return persistenceSourceCatalog.map(({ currentPath, legacyPath }) => {
    if (snippets[currentPath] !== undefined) {
      return currentPath;
    }

    if (legacyPath !== undefined && snippets[legacyPath] !== undefined) {
      return legacyPath;
    }

    // Missing evidence must retain its primary path, not pretend a legacy source exists.
    return currentPath;
  });
}
