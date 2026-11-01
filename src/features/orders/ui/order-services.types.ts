import type { Order, Product } from '../domain/order';
import type { createOrder } from '../application/create-order';

export interface OrderDemoServices {
  catalog: readonly Product[];
  submitOrder: ReturnType<typeof createOrder>;
  simulateFailure: () => void;
  listOrders: () => Promise<readonly Order[]>;
  clearOrders: () => Promise<void>;
}
