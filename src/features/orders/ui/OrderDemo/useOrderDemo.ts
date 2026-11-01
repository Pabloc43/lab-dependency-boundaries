import { useEffect, useReducer, useRef, useState } from 'react';
import type { OrderDemoServices } from '../order-services.types';
import {
  initialSubmissionState,
  submissionReducer,
  submissionView,
} from './submission-state';

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
  const [submission, dispatch] = useReducer(submissionReducer, initialSubmissionState);
  const [failure, setFailure] = useState(false);
  const inFlight = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  function changeQuantity(productId: string, value: string) {
    setQuantities((current) => ({ ...current, [productId]: value }));
  }

  async function submit() {
    if (!mounted.current || inFlight.current) {
      return;
    }

    inFlight.current = true;
    dispatch({ type: 'started' });

    try {
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

      const order = await submitOrder(lines);

      if (mounted.current) {
        dispatch({ type: 'succeeded', order });
      }
    } catch (cause: unknown) {
      if (mounted.current) {
        dispatch({ type: 'failed', cause });
      }
    } finally {
      inFlight.current = false;

      if (mounted.current) {
        setFailure(false);
      }
    }
  }

  return {
    quantities,
    dismissOrder: () => dispatch({ type: 'dismissed' }),
    changeQuantity,
    ...submissionView(submission),
    failure,
    setFailure,
    submit,
  };
}
