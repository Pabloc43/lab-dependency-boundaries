import {
  calculateOrder,
  type Order,
  type OrderLine,
  type Product,
} from '../domain/order';
export interface OrderRepository {
  save(order: Order): Promise<void>;
}

export interface CreateOrderDependencies {
  readonly repository: OrderRepository;
  readonly catalog: readonly Product[];
  readonly nextId: () => string;
}

export function createOrder({ repository, catalog, nextId }: CreateOrderDependencies) {
  return async (lines: readonly OrderLine[]): Promise<Order> => {
    const priced = calculateOrder(lines, catalog);
    const order: Order = { id: nextId(), ...priced };
    await repository.save(order);
    return order;
  };
}
