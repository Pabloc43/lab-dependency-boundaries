import { useCallback, useEffect, useState } from 'react';
import type { Order } from '../domain/order';
import type { OrderDemoServices } from './useOrderDemo';

export function useOrderHistory(
  { listOrders, clearOrders }: OrderDemoServices,
  saved: Order | null,
) {
  const [orders, setOrders] = useState<readonly Order[]>([]);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    listOrders()
      .then((items) => {
        if (active) {
          setOrders(items);
          if (items.length > 0) {
            setNotice('');
          }
          setError('');
          setPending(false);
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setOrders([]);
          setError(
            cause instanceof Error ? cause.message : 'No se pudo leer el historial.',
          );
          setPending(false);
        }
      });
    return () => {
      active = false;
    };
  }, [listOrders, saved, revision]);
  const clear = useCallback(async () => {
    setPending(true);
    setNotice('');
    try {
      await clearOrders();
      setOrders([]);
      setError('');
      setNotice(
        'Se borró el historial de este lab. Los demás datos del navegador no se modificaron.',
      );
      setRevision((current) => current + 1);
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'No se pudo borrar el historial.',
      );
    } finally {
      setPending(false);
    }
  }, [clearOrders]);
  return { orders, pending, error, notice, clear };
}
