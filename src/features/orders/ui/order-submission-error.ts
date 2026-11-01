import { OrderValidationError } from '../domain/order';
import { OrderRepositoryError } from '../application/order-repository';

export function orderSubmissionErrorMessage(cause: unknown): string {
  if (cause instanceof OrderValidationError || cause instanceof OrderRepositoryError) {
    return cause.message;
  }
  if (cause instanceof Error) {
    return `No se pudo guardar el pedido. ${cause.message}`;
  }
  return 'No se pudo guardar el pedido. Intenta nuevamente.';
}
