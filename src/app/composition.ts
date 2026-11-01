import { createOrder } from '../features/orders/application/create-order';
import { orderHistory } from '../features/orders/application/order-history';
import { LocalStorageOrderRepository } from '../features/orders/infrastructure/local-storage-order-repository';
import type { Product } from '../features/orders/domain/order';
export function buildApp() {
  const catalog: readonly Product[] = [
    { id: 'notebook', name: 'Cuaderno de taller', priceCents: 1250 },
    { id: 'pencil', name: 'Lápiz de grafito', priceCents: 350 },
    { id: 'ruler', name: 'Regla de aluminio', priceCents: 800 },
  ];
  const repository = new LocalStorageOrderRepository(() => window.localStorage);
  let failNext = false;
  const submitOrder = createOrder({
    repository: {
      async save(order) {
        if (failNext) {
          failNext = false;
          throw new Error(
            'Falla simulada antes de escribir: el pedido no se guardó. Puedes volver a intentarlo.',
          );
        }
        await repository.save(order);
      },
    },
    catalog,
    nextId: () => crypto.randomUUID(),
  });
  return {
    catalog,
    submitOrder: async (lines: Parameters<typeof submitOrder>[0]) => {
      try {
        return await submitOrder(lines);
      } finally {
        failNext = false;
      }
    },
    ...orderHistory(repository),
    simulateFailure: () => {
      failNext = true;
    },
  };
}
