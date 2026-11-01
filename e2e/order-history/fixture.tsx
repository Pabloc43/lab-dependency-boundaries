import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Order } from '../../src/features/orders/domain/order';
import type { OrderDemoServices } from '../../src/features/orders/ui/order-services.types';
import { useOrderHistory } from '../../src/features/orders/ui/OrderHistory/useOrderHistory';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((accept, decline) => {
    resolve = accept;
    reject = decline;
  });

  return { promise, resolve, reject };
}

const reads: ReturnType<typeof deferred<readonly Order[]>>[] = [];
const deletes: ReturnType<typeof deferred<void>>[] = [];
const clearResults: boolean[] = [];
let clearHistory: () => Promise<boolean>;
let changeSaved: () => void;
let renders = 0;

const services: OrderDemoServices = {
  catalog: [],
  submitOrder: async () => {
    throw new Error('Not used by this harness.');
  },
  simulateFailure: () => {},
  listOrders: () => {
    const request = deferred<readonly Order[]>();
    reads.push(request);

    return request.promise;
  },
  clearOrders: () => {
    const request = deferred<void>();
    deletes.push(request);

    return request.promise;
  },
};

function Harness() {
  const [saved, setSaved] = useState<Order | null>(null);
  const { clear, ...view } = useOrderHistory(services, saved);
  clearHistory = clear;
  changeSaved = () =>
    setSaved({
      id: 'saved',
      lines: [{ productId: 'book', name: 'Book', quantity: 1, unitPriceCents: 100 }],
      totalCents: 100,
    });
  renders += 1;

  return <output>{JSON.stringify(view)}</output>;
}

const root = createRoot(document.getElementById('root')!);
root.render(<Harness />);

const api = {
  counts: () => ({ reads: reads.length, deletes: deletes.length, renders }),
  resolveRead: (index: number, orders: readonly Order[]) => reads[index].resolve(orders),
  rejectRead: (index: number, message: string | null) =>
    reads[index].reject(message === null ? null : new Error(message)),
  resolveClear: (index: number) => deletes[index].resolve(),
  rejectClear: (index: number, message: string | null) =>
    deletes[index].reject(message === null ? null : new Error(message)),
  clear: async () => {
    clearResults.push(await clearHistory());
  },
  doubleClear: () => {
    api.clear();
    api.clear();
  },
  results: () => clearResults,
  changeSaved: () => changeSaved(),
  unmount: () => root.unmount(),
};

declare global {
  interface Window {
    historyHarness: typeof api;
  }
}

window.historyHarness = api;
