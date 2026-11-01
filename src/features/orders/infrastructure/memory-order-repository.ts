import type { OrderHistoryRepository } from '../application/order-repository';
import type { Order } from '../domain/order';
export class MemoryOrderRepository implements OrderHistoryRepository {
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
    this.orders.delete(order.id);
    this.orders.set(order.id, structuredClone(order));
  }
  async list(): Promise<readonly Order[]> {
    return structuredClone([...this.orders.values()].reverse());
  }
  async clear(): Promise<void> {
    this.orders.clear();
  }
  find(id: string): Order | undefined {
    const order = this.orders.get(id);
    return order ? structuredClone(order) : undefined;
  }
}
