import { expect, it } from 'vitest';
import { OrderValidationError } from '../../domain/order';
import { OrderRepositoryError } from '../../application/order-repository';
import { orderSubmissionErrorMessage } from './order-submission-error';

it('preserves validation and repository operation messages', () => {
  expect(
    orderSubmissionErrorMessage(
      new OrderValidationError('La cantidad debe ser un entero entre 1 y 20.'),
    ),
  ).toBe('La cantidad debe ser un entero entre 1 y 20.');
  expect(
    orderSubmissionErrorMessage(
      new OrderRepositoryError('No se pudo guardar el pedido en este navegador.'),
    ),
  ).toBe('No se pudo guardar el pedido en este navegador.');
  expect(
    orderSubmissionErrorMessage(
      new OrderRepositoryError('No se pudo leer el historial local.'),
    ),
  ).toBe('No se pudo leer el historial local.');
});

it('adds context to a simulated failure without classifying its wording', () => {
  const message =
    'Falla simulada antes de escribir: el pedido no se guardó. Puedes volver a intentarlo.';
  expect(orderSubmissionErrorMessage(new Error(message))).toBe(
    `No se pudo guardar el pedido. ${message}`,
  );
});

it('uses a safe fallback for non-Error failures', () => {
  for (const cause of [undefined, null, 'failure', { message: 'failure' }]) {
    expect(orderSubmissionErrorMessage(cause)).toBe(
      'No se pudo guardar el pedido. Intenta nuevamente.',
    );
  }
});

it.each([Error, OrderValidationError, OrderRepositoryError])(
  'uses a useful fallback for empty %s messages without changing meaningful messages',
  (ErrorType) => {
    for (const message of ['', '   ']) {
      expect(orderSubmissionErrorMessage(new ErrorType(message))).toBe(
        'No se pudo guardar el pedido. Intenta nuevamente.',
      );
    }

    const message = '  Useful detail  ';
    const expected =
      ErrorType === Error ? `No se pudo guardar el pedido. ${message}` : message;
    expect(orderSubmissionErrorMessage(new ErrorType(message))).toBe(expected);
  },
);
