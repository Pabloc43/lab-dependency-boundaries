import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { Order } from '../../domain/order';
import type { OrderDemoServices } from '../order-services.types';
import { historyReducer, historyView, initialHistoryState } from './order-history-state';

export function useOrderHistory(
  { listOrders, clearOrders }: OrderDemoServices,
  saved: Order | null,
) {
  const [state, dispatch] = useReducer(historyReducer, initialHistoryState);
  const [revision, setRevision] = useState(0);
  const readVersion = useRef(0);
  const mounted = useRef(false);
  const clearInFlight = useRef(false);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
      readVersion.current += 1;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const version = ++readVersion.current;

    async function loadHistory() {
      dispatch({ type: 'readStarted' });

      try {
        const orders = await listOrders();

        if (active && version === readVersion.current) {
          dispatch({ type: 'readSucceeded', orders });
        }
      } catch (cause: unknown) {
        if (active && version === readVersion.current) {
          dispatch({
            type: 'readFailed',
            cause,
          });
        }
      }
    }

    void loadHistory();

    return () => {
      active = false;
    };
  }, [listOrders, saved, revision]);

  const clear = useCallback(async () => {
    if (!mounted.current || clearInFlight.current) {
      return false;
    }

    clearInFlight.current = true;
    readVersion.current += 1;
    dispatch({ type: 'clearStarted' });

    try {
      await clearOrders();

      if (!mounted.current) {
        return false;
      }

      // Discard even reads started during deletion; only a new read may follow success.
      readVersion.current += 1;
      dispatch({ type: 'clearSucceeded' });
      setRevision((current) => current + 1);

      return true;
    } catch (cause: unknown) {
      if (mounted.current) {
        dispatch({
          type: 'clearFailed',
          cause,
        });
      }

      return false;
    } finally {
      clearInFlight.current = false;
    }
  }, [clearOrders]);

  return { ...historyView(state), clear };
}
