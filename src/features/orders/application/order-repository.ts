import type { Order } from '../domain/order';

export interface OrderRepository {
  save(order: Order): Promise<void>;
}

export interface OrderHistoryRepository extends OrderRepository {
  list(): Promise<readonly Order[]>;
  clear(): Promise<void>;
}

// Repository failures carry a user-facing operation message across the port.
export class OrderRepositoryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'OrderRepositoryError';
  }
}
