import { createOrder } from '../features/orders/application/create-order';
import { MemoryOrderRepository } from '../features/orders/infrastructure/memory-order-repository';
import type { Product } from '../features/orders/domain/order';
export function buildApp() {
  const catalog: readonly Product[] = [
    { id: 'notebook', name: 'Cuaderno de taller', priceCents: 1250 },
    { id: 'pencil', name: 'Lápiz de grafito', priceCents: 350 },
    { id: 'ruler', name: 'Regla de aluminio', priceCents: 800 },
  ];
  const repository = new MemoryOrderRepository();
  return {
    catalog,
    submitOrder: createOrder({ repository, catalog, nextId: () => crypto.randomUUID() }),
    simulateFailure: () => repository.simulateNextFailure(),
  };
}
