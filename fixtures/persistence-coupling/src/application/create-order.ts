import {
  calculateOrder,
  type Order,
  type OrderLine,
  type Product,
} from '../domain/order';
import { LocalStorageOrderRepository } from '../infrastructure/local-storage-order-repository';

export interface CreateOrderDependencies {
  readonly getStorage: () => Storage;
  readonly catalog: readonly Product[];
  readonly nextId: () => string;
}

export function createOrder({ getStorage, catalog, nextId }: CreateOrderDependencies) {
  const repository = new LocalStorageOrderRepository(getStorage);
  return async (lines: readonly OrderLine[]): Promise<Order> => {
    const priced = calculateOrder(lines, catalog);
    const order: Order = { id: nextId(), ...priced };
    await repository.save(order);
    return order;
  };
}
