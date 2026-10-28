import type { OrderRepository } from '../application/create-order';
import type { Order } from '../domain/order';
export class MemoryOrderRepository implements OrderRepository {
  private readonly orders = new Map<string, Order>();
  private failNext = false;
  simulateNextFailure(): void {
    this.failNext = true;
  }
  async save(order: Order): Promise<void> {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('Simulated repository failure');
    }
    // Store a copy so callers cannot mutate persisted state through a reference.
    this.orders.set(order.id, structuredClone(order));
  }
  find(id: string): Order | undefined {
    const order = this.orders.get(id);
    return order ? structuredClone(order) : undefined;
  }
}
