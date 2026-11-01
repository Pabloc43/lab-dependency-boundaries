import { createRoot } from 'react-dom/client';
import type { Order, OrderLine } from '../../src/features/orders/domain/order';
import { OrderValidationError } from '../../src/features/orders/domain/order';
import { OrderRepositoryError } from '../../src/features/orders/application/order-repository';
import type { OrderDemoServices } from '../../src/features/orders/ui/order-services.types';
import { useOrderDemo } from '../../src/features/orders/ui/OrderDemo/useOrderDemo';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((accept, decline) => {
    resolve = accept;
    reject = decline;
  });

  return { promise, resolve, reject };
}

const attempts: {
  lines: readonly OrderLine[];
  result: ReturnType<typeof deferred<Order>>;
}[] = [];
let simulationCalls = 0;
let simulationThrows = false;
let renders = 0;
let hook: ReturnType<typeof useOrderDemo>;

const services: OrderDemoServices = {
  catalog: [
    { id: 'notebook', name: 'Notebook', priceCents: 100 },
    { id: 'pencil', name: 'Pencil', priceCents: 50 },
    { id: 'ruler', name: 'Ruler', priceCents: 80 },
  ],
  submitOrder: (lines) => {
    const result = deferred<Order>();
    attempts.push({ lines, result });

    return result.promise;
  },
  simulateFailure: () => {
    simulationCalls += 1;

    if (simulationThrows) {
      throw new Error('Simulation setup failed');
    }
  },
  listOrders: async () => [],
  clearOrders: async () => {},
};

function Harness() {
  hook = useOrderDemo(services);
  const { quantities, pending, order, error, failure } = hook;
  renders += 1;

  return (
    <output>{JSON.stringify({ quantities, pending, order, error, failure })}</output>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<Harness />);

const api = {
  counts: () => ({ attempts: attempts.length, simulationCalls, renders }),
  lines: (index: number) => attempts[index].lines,
  submit: () => {
    void hook.submit();
  },
  doubleSubmit: () => {
    void hook.submit();
    void hook.submit();
  },
  resolve: (index: number, order: Order) => attempts[index].result.resolve(order),
  reject: (
    index: number,
    kind: 'validation' | 'repository' | 'generic' | 'unknown',
    message: string,
  ) => {
    let cause: unknown = null;

    if (kind === 'validation') {
      cause = new OrderValidationError(message);
    } else if (kind === 'repository') {
      cause = new OrderRepositoryError(message);
    } else if (kind === 'generic') {
      cause = new Error(message);
    }

    attempts[index].result.reject(cause);
  },
  changeQuantity: (id: string, value: string) => hook.changeQuantity(id, value),
  setFailure: (value: boolean) => hook.setFailure(value),
  simulationThrows: (value: boolean) => {
    simulationThrows = value;
  },
  dismiss: () => hook.dismissOrder(),
  unmount: () => root.unmount(),
};

declare global {
  interface Window {
    orderDemoHarness: typeof api;
  }
}

window.orderDemoHarness = api;
