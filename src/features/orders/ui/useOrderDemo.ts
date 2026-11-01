import { useState } from 'react';
import { type Order, type Product } from '../domain/order';
import { orderSubmissionErrorMessage } from './order-submission-error';
import type { createOrder } from '../application/create-order';

export interface OrderDemoServices {
  catalog: readonly Product[];
  submitOrder: ReturnType<typeof createOrder>;
  simulateFailure: () => void;
  listOrders: () => Promise<readonly Order[]>;
  clearOrders: () => Promise<void>;
}

export function useOrderDemo({
  catalog,
  submitOrder,
  simulateFailure,
}: OrderDemoServices) {
  const [quantities, setQuantities] = useState<Record<string, string>>({
    notebook: '1',
    pencil: '2',
    ruler: '0',
  });
  const [pending, setPending] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [failure, setFailure] = useState(false);

  function changeQuantity(productId: string, value: string) {
    setQuantities((current) => ({ ...current, [productId]: value }));
  }

  async function submit() {
    setPending(true);
    setError('');
    setOrder(null);
    const lines = catalog
      .filter(
        (product) =>
          Number(quantities[product.id]) !== 0 || quantities[product.id] === '',
      )
      .map((product) => ({
        productId: product.id,
        quantity: Number(quantities[product.id]),
      }));
    if (failure) {
      simulateFailure();
    }
    try {
      setOrder(await submitOrder(lines));
    } catch (cause) {
      setError(orderSubmissionErrorMessage(cause));
    } finally {
      setPending(false);
      setFailure(false);
    }
  }
  return {
    quantities,
    dismissOrder: () => setOrder(null),
    changeQuantity,
    pending,
    order,
    error,
    failure,
    setFailure,
    submit,
  };
}
