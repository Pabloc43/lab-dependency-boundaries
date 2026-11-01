import { describe, expect, it } from 'vitest';
import { decodeOrderDocument, isStoredOrder } from './index';

const line = {
  productId: 'notebook',
  name: 'Notebook',
  quantity: 2,
  unitPriceCents: 1250,
};
const order = { id: 'one', lines: [line], totalCents: 2500 };

describe('persisted order validation', () => {
  it('accepts valid quantities and safe nonnegative cent amounts', () => {
    for (const quantity of [1, 20]) {
      expect(
        isStoredOrder({
          ...order,
          lines: [{ ...line, quantity }],
          totalCents: quantity * 1250,
        }),
      ).toBe(true);
    }

    expect(
      isStoredOrder({ ...order, lines: [{ ...line, unitPriceCents: 0 }], totalCents: 0 }),
    ).toBe(true);
    expect(
      isStoredOrder({
        ...order,
        lines: [{ ...line, quantity: 1, unitPriceCents: Number.MAX_SAFE_INTEGER }],
        totalCents: Number.MAX_SAFE_INTEGER,
      }),
    ).toBe(true);
  });

  it.each([null, undefined, false, [], 'order', 1])(
    'rejects a non-record order: %s',
    (value) => {
      expect(isStoredOrder(value)).toBe(false);
    },
  );

  it.each(['', '  ', null, undefined, 1, true, [], {}])(
    'rejects invalid text fields: %s',
    (value) => {
      expect(isStoredOrder({ ...order, id: value })).toBe(false);
      expect(isStoredOrder({ ...order, lines: [{ ...line, productId: value }] })).toBe(
        false,
      );
      expect(isStoredOrder({ ...order, lines: [{ ...line, name: value }] })).toBe(false);
    },
  );

  it.each([
    '2',
    null,
    undefined,
    true,
    {},
    [],
    NaN,
    Infinity,
    -Infinity,
    -1,
    0,
    1.5,
    21,
    Number.MAX_SAFE_INTEGER + 1,
  ])('rejects an invalid quantity: %s', (quantity) => {
    expect(isStoredOrder({ ...order, lines: [{ ...line, quantity }] })).toBe(false);
  });

  it.each([
    '1250',
    null,
    undefined,
    true,
    {},
    [],
    NaN,
    Infinity,
    -Infinity,
    -1,
    0.5,
    Number.MAX_SAFE_INTEGER + 1,
  ])('rejects invalid cent amounts: %s', (value) => {
    expect(isStoredOrder({ ...order, totalCents: value })).toBe(false);
    expect(isStoredOrder({ ...order, lines: [{ ...line, unitPriceCents: value }] })).toBe(
      false,
    );
  });

  it.each([null, undefined, {}, 'lines', [], [null], [[]], new Array(1)])(
    'rejects invalid or empty lines: %s',
    (lines) => {
      expect(isStoredOrder({ ...order, lines })).toBe(false);
    },
  );

  it('separates duplicate product identities from arithmetic consistency', () => {
    expect(
      isStoredOrder({ ...order, lines: [line, { ...line }], totalCents: 5000 }),
    ).toBe(false);
    expect(
      isStoredOrder({
        ...order,
        lines: [line, { ...line, productId: 'pencil' }],
        totalCents: 5000,
      }),
    ).toBe(true);
    expect(isStoredOrder({ ...order, totalCents: 2499 })).toBe(false);
  });

  it('rejects totals that overflow during multiplication or addition', () => {
    const expensive = { ...line, unitPriceCents: Number.MAX_SAFE_INTEGER };
    expect(isStoredOrder({ ...order, lines: [expensive], totalCents: 0 })).toBe(false);
    expect(
      isStoredOrder({
        ...order,
        lines: [
          { ...expensive, quantity: 1 },
          { ...line, productId: 'other', quantity: 1, unitPriceCents: 1 },
        ],
        totalCents: Number.MAX_SAFE_INTEGER,
      }),
    ).toBe(false);
  });

  it('allows additional properties and surrounding whitespace without mutation', () => {
    const value = {
      ...order,
      id: ' one ',
      extra: { keep: true },
      lines: [{ ...line, productId: ' notebook ', name: ' Notebook ', extra: 'keep' }],
    };
    const before = structuredClone(value);
    expect(isStoredOrder(value)).toBe(true);
    expect(value).toEqual(before);
    expect(
      isStoredOrder({
        ...order,
        lines: [line, { ...line, productId: ' notebook ' }],
        totalCents: 5000,
      }),
    ).toBe(true);
  });
});

describe('persisted document decoding', () => {
  it('accepts empty history and retains additional properties without normalizing text', () => {
    expect(decodeOrderDocument('{"version":1,"orders":[],"extra":true}')).toEqual([]);

    const value = {
      ...order,
      id: ' one ',
      extra: { keep: true },
      lines: [{ ...line, extra: 'keep' }],
    };
    expect(
      decodeOrderDocument(JSON.stringify({ version: 1, orders: [value], extra: true })),
    ).toEqual([value]);
  });

  it.each([
    null,
    [],
    {},
    { version: '1', orders: [] },
    { version: 2, orders: [] },
    { orders: [] },
    { version: 1 },
    { version: 1, orders: {} },
    { version: 1, orders: [null] },
    { version: 1, orders: [order, order] },
  ])('rejects incompatible shape, version or duplicate order IDs: %s', (value) => {
    expect(() => decodeOrderDocument(JSON.stringify(value))).toThrow(
      'Invalid order document',
    );
  });

  it('rejects malformed JSON and does not accept JSON numeric strings', () => {
    expect(() => decodeOrderDocument('{broken')).toThrow(SyntaxError);
    expect(() =>
      decodeOrderDocument(
        JSON.stringify({ version: 1, orders: [{ ...order, totalCents: '2500' }] }),
      ),
    ).toThrow('Invalid order document');
  });
});
