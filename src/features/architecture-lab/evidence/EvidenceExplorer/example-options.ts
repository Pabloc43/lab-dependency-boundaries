import type { Evidence } from '../evidence.types';

export type ExampleId = 'domain-to-ui' | 'cycle' | 'valid' | 'persistence-coupling';

interface ExampleOption {
  readonly id: ExampleId;
  readonly label: string;
}

export const exampleOptions: readonly ExampleOption[] = [
  { id: 'domain-to-ui', label: 'Import incorrecto' },
  { id: 'cycle', label: 'Dependencia circular' },
  { id: 'valid', label: 'Aplicación válida' },
  { id: 'persistence-coupling', label: 'Persistencia acoplada' },
];

const domainFixture = 'fixtures/domain-to-ui/src/domain/order.ts';
const currentUseCase = 'src/features/orders/application/create-order.ts';
const legacyUseCase = 'src/application/create-order.ts';

export function exampleSourcePath(
  example: ExampleId,
  evidence: Pick<Evidence, 'snippets'> | null,
): string {
  if (example === 'domain-to-ui') {
    return domainFixture;
  }

  if (evidence?.snippets[currentUseCase] !== undefined) {
    return currentUseCase;
  }

  return legacyUseCase;
}
