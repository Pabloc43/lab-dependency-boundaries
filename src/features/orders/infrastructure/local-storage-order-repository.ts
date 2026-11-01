import type { OrderHistoryRepository } from '../application/order-repository';
import type { Order } from '../domain/order';

export const ORDER_STORAGE_KEY = 'lab-dependency-boundaries:orders:v1';
export type OrderStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export class OrderStorageError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'OrderStorageError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOrder(value: unknown): value is Order {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !value.id.trim() ||
    !Array.isArray(value.lines) ||
    value.lines.length === 0 ||
    !Number.isSafeInteger(value.totalCents) ||
    (value.totalCents as number) < 0
  ) {
    return false;
  }
  const seen = new Set<string>();
  let total = 0;
  for (const line of value.lines) {
    if (
      !isRecord(line) ||
      typeof line.productId !== 'string' ||
      !line.productId.trim() ||
      typeof line.name !== 'string' ||
      !line.name.trim() ||
      seen.has(line.productId) ||
      !Number.isSafeInteger(line.quantity) ||
      (line.quantity as number) < 1 ||
      (line.quantity as number) > 20 ||
      !Number.isSafeInteger(line.unitPriceCents) ||
      (line.unitPriceCents as number) < 0
    ) {
      return false;
    }
    seen.add(line.productId);
    total += (line.quantity as number) * (line.unitPriceCents as number);
  }
  return Number.isSafeInteger(total) && total === value.totalCents;
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
      const document: unknown = JSON.parse(raw);
      if (
        !isRecord(document) ||
        document.version !== 1 ||
        !Array.isArray(document.orders) ||
        !document.orders.every(isOrder) ||
        new Set(document.orders.map((order) => order.id)).size !== document.orders.length
      ) {
        throw new Error('Invalid order document');
      }
      return structuredClone(document.orders);
    } catch (cause) {
      throw new OrderStorageError(
        'No se pudo leer el historial local. El almacenamiento puede estar bloqueado o contener datos incompatibles. Puedes borrar solo los datos de este lab para restablecerlo.',
        { cause },
      );
    }
  }

  async save(order: Order): Promise<void> {
    if (!isOrder(order)) {
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
