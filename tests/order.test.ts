import { describe, expect, it } from 'vitest';
import { calculateOrder, type Product } from '../src/domain/order';
import { createOrder } from '../src/application/create-order';
import { MemoryOrderRepository } from '../src/infrastructure/memory-order-repository';
const catalog: readonly Product[] = [
  { id: 'a', name: 'Notebook', priceCents: 1250 },
  { id: 'b', name: 'Pencil', priceCents: 350 },
];
describe('order rules', () => {
  it('calculates in integer cents', () =>
    expect(
      calculateOrder(
        [
          { productId: 'a', quantity: 1 },
          { productId: 'b', quantity: 2 },
        ],
        catalog,
      ).totalCents,
    ).toBe(1950));
  it('rejects an empty order', () =>
    expect(() => calculateOrder([], catalog)).toThrow('al menos'));
  it.each([0, -1, 1.5, 21, NaN, Infinity])('rejects invalid quantity %s', (quantity) =>
    expect(() => calculateOrder([{ productId: 'a', quantity }], catalog)).toThrow(
      'cantidad',
    ),
  );
  it('rejects an unknown product', () =>
    expect(() =>
      calculateOrder([{ productId: 'missing', quantity: 1 }], catalog),
    ).toThrow('catálogo'));
  it('rejects duplicate lines', () =>
    expect(() =>
      calculateOrder(
        [
          { productId: 'a', quantity: 1 },
          { productId: 'a', quantity: 1 },
        ],
        catalog,
      ),
    ).toThrow('repetirse'));
  it('rejects invalid catalog prices', () =>
    expect(() =>
      calculateOrder(
        [{ productId: 'a', quantity: 1 }],
        [{ ...catalog[0], priceCents: -1 }],
      ),
    ).toThrow('precio'));
  it('rejects an unsafe total', () =>
    expect(() =>
      calculateOrder(
        [{ productId: 'a', quantity: 20 }],
        [{ ...catalog[0], priceCents: Number.MAX_SAFE_INTEGER }],
      ),
    ).toThrow('rango'));
});
describe('create order', () => {
  it('persists a calculated order through its port', async () => {
    const repository = new MemoryOrderRepository();
    const submit = createOrder({ repository, catalog, nextId: () => 'order-1' });
    const order = await submit([{ productId: 'a', quantity: 2 }]);
    expect(order.totalCents).toBe(2500);
    expect(repository.find('order-1')).toEqual(order);
  });
  it('does not save an invalid order', async () => {
    let saved = false;
    const submit = createOrder({
      repository: {
        save: async () => {
          saved = true;
        },
      },
      catalog,
      nextId: () => 'invalid',
    });
    await expect(submit([])).rejects.toThrow();
    expect(saved).toBe(false);
  });
  it('propagates storage failure and allows retry', async () => {
    const repository = new MemoryOrderRepository();
    const submit = createOrder({ repository, catalog, nextId: () => 'retry' });
    repository.simulateNextFailure();
    await expect(submit([{ productId: 'a', quantity: 1 }])).rejects.toThrow('Simulated');
    expect(repository.find('retry')).toBeUndefined();
    await expect(submit([{ productId: 'a', quantity: 1 }])).resolves.toHaveProperty(
      'id',
      'retry',
    );
  });
  it('does not expose stored objects for mutation', async () => {
    const repository = new MemoryOrderRepository();
    const original = {
      id: 'copy',
      lines: [{ productId: 'a', name: 'Notebook', quantity: 1, unitPriceCents: 1250 }],
      totalCents: 1250,
    };
    await repository.save(original);
    original.totalCents = 1;
    expect(repository.find('copy')?.totalCents).toBe(1250);
  });
});
