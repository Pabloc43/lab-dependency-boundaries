import {
  OrderRepositoryError,
  type OrderHistoryRepository,
} from '../../../application/order-repository';
import { decodeOrderDocument, isStoredOrder } from './order-storage-codec';
import type { Order } from '../../../domain/order';

export const ORDER_STORAGE_KEY = 'lab-dependency-boundaries:orders:v1';

export type OrderStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export class OrderStorageError extends OrderRepositoryError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'OrderStorageError';
  }
}

// Resolve storage lazily: even accessing window.localStorage can throw.
export class LocalStorageOrderRepository implements OrderHistoryRepository {
  constructor(private readonly getStorage: () => OrderStorage) {}

  async list(): Promise<readonly Order[]> {
    try {
      const raw = this.getStorage().getItem(ORDER_STORAGE_KEY);
      if (raw === null) {
        return [];
      }

      return structuredClone(decodeOrderDocument(raw));
    } catch (cause) {
      throw new OrderStorageError(
        'No se pudo leer el historial local. El almacenamiento puede estar bloqueado o contener datos incompatibles. Puedes borrar solo los datos de este lab para restablecerlo.',
        { cause },
      );
    }
  }

  async save(order: Order): Promise<void> {
    if (!isStoredOrder(order)) {
      throw new OrderStorageError('El pedido no tiene un formato válido.');
    }

    // Read first: do not silently overwrite a malformed or unknown document.
    const orders = await this.list();
    const next = [
      structuredClone(order),
      ...orders.filter((item) => item.id !== order.id),
    ];

    try {
      this.getStorage().setItem(
        ORDER_STORAGE_KEY,
        JSON.stringify({ version: 1, orders: next }),
      );
    } catch (cause) {
      throw new OrderStorageError(
        'No se pudo guardar el pedido en este navegador. Revisa los permisos o el espacio disponible; no se guardó en memoria como alternativa.',
        { cause },
      );
    }
  }

  async clear(): Promise<void> {
    try {
      this.getStorage().removeItem(ORDER_STORAGE_KEY);
    } catch (cause) {
      throw new OrderStorageError(
        'No se pudo borrar el historial local. Revisa los permisos del navegador.',
        { cause },
      );
    }
  }
}
