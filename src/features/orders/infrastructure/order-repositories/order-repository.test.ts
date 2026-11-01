import { describe, expect, it } from 'vitest';
import {
  LocalStorageOrderRepository,
  ORDER_STORAGE_KEY,
  type OrderStorage,
} from './local-storage';
import { MemoryOrderRepository } from './memory-order-repository';
import type { Order } from '../../domain/order';
import type { OrderHistoryRepository } from '../../application/order-repository';

function storage() {
  const values = new Map<string, string>();
  const adapter: OrderStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };

  return { values, adapter };
}

const order = (id = 'one'): Order => ({
  id,
  lines: [{ productId: 'a', name: 'Notebook', quantity: 2, unitPriceCents: 1250 }],
  totalCents: 2500,
});
const factories: [string, () => OrderHistoryRepository][] = [
  ['memory', () => new MemoryOrderRepository()],
  [
    'localStorage',
    () => {
      const { adapter } = storage();
      return new LocalStorageOrderRepository(() => adapter);
    },
  ],
];

for (const [name, factory] of factories) {
  describe(`${name} repository contract`, () => {
    it('starts empty, upserts by id and lists newest first', async () => {
      const repository = factory();
      expect(await repository.list()).toEqual([]);

      await repository.save(order());
      await repository.save(order('two'));
      await repository.save(order());
      expect((await repository.list()).map((item) => item.id)).toEqual(['one', 'two']);
    });

    it('isolates input and output references', async () => {
      const repository = factory();
      const input = structuredClone(order());

      await repository.save(input);
      (input.lines[0] as { name: string }).name = 'Changed';

      const output = await repository.list();

      (output[0].lines[0] as { name: string }).name = 'Also changed';
      expect(await repository.list()).toEqual([order()]);
    });

    it('clears its orders and can save again', async () => {
      const repository = factory();

      await repository.save(order());
      await repository.clear();
      expect(await repository.list()).toEqual([]);

      await repository.save(order('after'));
      expect(await repository.list()).toEqual([order('after')]);
    });
  });
}

describe('local storage failures and format', () => {
  it('recovers from a new adapter instance and uses a versioned document', async () => {
    const { adapter, values } = storage();

    await new LocalStorageOrderRepository(() => adapter).save(order());
    expect(JSON.parse(values.get(ORDER_STORAGE_KEY)!)).toEqual({
      version: 1,
      orders: [order()],
    });
    expect(await new LocalStorageOrderRepository(() => adapter).list()).toEqual([
      order(),
    ]);
  });

  const invalid = [
    '{bad json',
    'null',
    JSON.stringify({ version: 2, orders: [] }),
    JSON.stringify({ version: 1, orders: {} }),
    ...[
      { ...order(), id: '' },
      { ...order(), lines: [] },
      { ...order(), totalCents: 1 },
      { ...order(), totalCents: Infinity },
      { ...order(), lines: [{ ...order().lines[0], quantity: 0 }] },
      { ...order(), lines: [{ ...order().lines[0], quantity: 1.5 }] },
      { ...order(), lines: [{ ...order().lines[0], quantity: 21 }] },
      { ...order(), lines: [{ ...order().lines[0], unitPriceCents: -1 }] },
      { ...order(), lines: [...order().lines, ...order().lines] },
      { ...order(), lines: [{ ...order().lines[0], productId: 5 }] },
    ].map((value) => JSON.stringify({ version: 1, orders: [value] })),
    JSON.stringify({ version: 1, orders: [order(), order()] }),
  ];

  it.each(invalid)('rejects malformed data without overwriting it: %s', async (raw) => {
    const { adapter, values } = storage();

    values.set(ORDER_STORAGE_KEY, raw);
    values.set('unrelated', 'keep');

    const repository = new LocalStorageOrderRepository(() => adapter);
    await expect(repository.list()).rejects.toThrow('leer');
    await expect(repository.save(order())).rejects.toThrow('leer');
    expect(values.get(ORDER_STORAGE_KEY)).toBe(raw);

    await repository.clear();
    expect(values.get('unrelated')).toBe('keep');
    expect(await repository.list()).toEqual([]);
  });

  it('handles a blocked storage getter without a boot-time access', async () => {
    const repository = new LocalStorageOrderRepository(() => {
      throw new Error('SecurityError');
    });
    await expect(repository.list()).rejects.toThrow('leer');
    await expect(repository.save(order())).rejects.toThrow('leer');
    await expect(repository.clear()).rejects.toThrow('borrar');
  });

  it('handles read/write/quota/remove failures and retries without a memory fallback', async () => {
    const { adapter, values } = storage();
    let blocked = true;
    const repository = new LocalStorageOrderRepository(() => ({
      ...adapter,
      setItem: (key, value) => {
        if (blocked) {
          throw new Error('QuotaExceededError');
        }

        adapter.setItem(key, value);
      },
      removeItem: (key) => {
        if (blocked) {
          throw new Error('SecurityError');
        }

        adapter.removeItem(key);
      },
    }));
    await expect(repository.save(order())).rejects.toThrow('espacio');
    expect(values.size).toBe(0);
    await expect(repository.clear()).rejects.toThrow('borrar');

    blocked = false;
    await repository.save(order());
    expect(await repository.list()).toEqual([order()]);
  });

  it('rejects bad caller data before storage access', async () => {
    const repository = new LocalStorageOrderRepository(() => {
      throw new Error('should not access');
    });
    await expect(repository.save({ ...order(), totalCents: 0 })).rejects.toThrow(
      'formato',
    );
  });
});
