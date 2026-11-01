import type { OrderHistoryRepository } from './order-repository';

export function orderHistory(repository: OrderHistoryRepository) {
  return {
    listOrders: () => repository.list(),
    clearOrders: () => repository.clear(),
  };
}
