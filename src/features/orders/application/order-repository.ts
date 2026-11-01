import type { Order } from '../domain/order';

export interface OrderRepository {
  save(order: Order): Promise<void>;
}

export interface OrderHistoryRepository extends OrderRepository {
  list(): Promise<readonly Order[]>;
  clear(): Promise<void>;
}
