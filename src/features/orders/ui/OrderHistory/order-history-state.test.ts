import { describe, expect, it } from 'vitest';
import type { Order } from '../../domain/order';
import {
  historyReducer,
  historyView,
  initialHistoryState,
  type HistoryState,
} from './order-history-state';

const order: Order = {
  id: 'one',
  lines: [{ productId: 'book', name: 'Book', quantity: 1, unitPriceCents: 100 }],
  totalCents: 100,
};
const loaded: HistoryState = {
  status: 'ready',
  snapshot: { kind: 'loaded', orders: [order] },
};

function cleared() {
  return historyReducer(historyReducer(loaded, { type: 'clearStarted' }), {
    type: 'clearSucceeded',
  });
}

describe('order history process', () => {
  it('starts unknown and loading, never announcing an empty successful list', () => {
    expect(historyView(initialHistoryState)).toEqual({
      orders: [],
      pending: true,
      error: '',
      notice: '',
    });
  });

  it('distinguishes an empty read from an explicit confirmed clear', () => {
    const empty = historyReducer(initialHistoryState, {
      type: 'readSucceeded',
      orders: [],
    });
    expect(empty).toEqual({ status: 'ready', snapshot: { kind: 'loaded', orders: [] } });
    expect(historyView(empty).notice).toBe('');
    expect(historyView(cleared()).notice).toContain('Se borró el historial');
  });

  it('refreshes the last known list while blocking another UI clear', () => {
    const refreshing = historyReducer(loaded, { type: 'readStarted' });
    expect(historyView(refreshing)).toMatchObject({
      orders: [order],
      pending: true,
      error: '',
      notice: '',
    });
  });

  it('read failure leaves unknown data with a read error, not a false empty success', () => {
    const failed = historyReducer(historyReducer(loaded, { type: 'readStarted' }), {
      type: 'readFailed',
      cause: new Error('Read blocked'),
    });
    expect(failed).toEqual({
      status: 'failed',
      operation: 'read',
      error: 'Read blocked',
      snapshot: null,
    });
    expect(historyView(failed)).toMatchObject({
      orders: [],
      pending: false,
      error: 'Read blocked',
      notice: '',
    });
  });

  it('clear failure retains the last known orders and never announces success', () => {
    const failed = historyReducer(historyReducer(loaded, { type: 'clearStarted' }), {
      type: 'clearFailed',
      cause: new Error('Delete blocked'),
    });
    expect(failed).toEqual({
      status: 'failed',
      operation: 'clear',
      error: 'Delete blocked',
      snapshot: loaded.snapshot,
    });
    expect(historyView(failed)).toMatchObject({
      orders: [order],
      pending: false,
      error: 'Delete blocked',
      notice: '',
    });
  });

  it('a new clear attempt invalidates an old announcement even if deletion fails', () => {
    const pending = historyReducer(cleared(), { type: 'clearStarted' });
    expect(historyView(pending)).toMatchObject({ pending: true, notice: '' });
    const failed = historyReducer(pending, {
      type: 'clearFailed',
      cause: new Error('Delete failed'),
    });
    expect(historyView(failed)).toMatchObject({ error: 'Delete failed', notice: '' });
  });

  it('a failed refresh after confirmed clear retains the fact of deletion and a separate read error', () => {
    const failed = historyReducer(historyReducer(cleared(), { type: 'readStarted' }), {
      type: 'readFailed',
      cause: new Error('Refresh failed'),
    });
    expect(failed).toEqual({
      status: 'failed',
      operation: 'read',
      error: 'Refresh failed',
      snapshot: { kind: 'cleared' },
    });
    expect(historyView(failed).notice).toContain('Se borró el historial');
    expect(historyView(failed).error).toBe('Refresh failed');
  });

  it('nonempty refresh invalidates the clear fact permanently, including subsequent read failure', () => {
    let state = historyReducer(cleared(), { type: 'readStarted' });
    state = historyReducer(state, { type: 'readSucceeded', orders: [order] });
    expect(historyView(state).notice).toBe('');
    state = historyReducer(state, { type: 'readStarted' });
    state = historyReducer(state, {
      type: 'readFailed',
      cause: new Error('Later read failed'),
    });
    expect(historyView(state).notice).toBe('');
  });

  it('empty refresh keeps only a genuinely confirmed clear announcement', () => {
    const state = historyReducer(historyReducer(cleared(), { type: 'readStarted' }), {
      type: 'readSucceeded',
      orders: [],
    });
    expect(state).toEqual(cleared());
  });

  it('background reads cannot end clearing and their latest data survives a delete failure', () => {
    let state = historyReducer(loaded, { type: 'clearStarted' });
    expect(historyReducer(state, { type: 'readStarted' })).toBe(state);
    state = historyReducer(state, { type: 'readSucceeded', orders: [] });
    expect(state.status).toBe('clearing');
    state = historyReducer(state, {
      type: 'clearFailed',
      cause: new Error('Delete failed'),
    });
    expect(historyView(state)).toMatchObject({
      orders: [],
      error: 'Delete failed',
      pending: false,
      notice: '',
    });
  });

  it('background refreshes update orders without hiding a delete failure', () => {
    let state = historyReducer(historyReducer(loaded, { type: 'clearStarted' }), {
      type: 'clearFailed',
      cause: new Error('Delete failed'),
    });
    expect(historyReducer(state, { type: 'readStarted' })).toBe(state);
    state = historyReducer(state, { type: 'readSucceeded', orders: [] });
    expect(historyView(state)).toMatchObject({
      orders: [],
      error: 'Delete failed',
      notice: '',
    });
    expect(
      historyReducer(state, {
        type: 'readFailed',
        cause: new Error('Background read failed'),
      }),
    ).toBe(state);
  });

  it.each([new Error(''), new Error('   '), null, 'not an Error'])(
    'uses useful failure messages for empty or unknown causes: %s',
    (cause) => {
      const read = historyReducer(initialHistoryState, { type: 'readFailed', cause });
      const clear = historyReducer(historyReducer(loaded, { type: 'clearStarted' }), {
        type: 'clearFailed',
        cause,
      });

      expect(historyView(read).error).toBe('No se pudo leer el historial.');
      expect(historyView(clear)).toMatchObject({
        orders: [order],
        error: 'No se pudo borrar el historial.',
        notice: '',
      });
    },
  );

  it('preserves meaningful Error messages verbatim rather than trimming them', () => {
    const message = '  Storage unavailable  ';
    const read = historyReducer(initialHistoryState, {
      type: 'readFailed',
      cause: new Error(message),
    });
    const clear = historyReducer(historyReducer(loaded, { type: 'clearStarted' }), {
      type: 'clearFailed',
      cause: new Error(message),
    });

    expect(historyView(read).error).toBe(message);
    expect(historyView(clear).error).toBe(message);
  });

  it('invalid completions do not manufacture clear success or a refreshed list', () => {
    expect(historyReducer(loaded, { type: 'clearSucceeded' })).toBe(loaded);
    expect(
      historyReducer(loaded, { type: 'clearFailed', cause: new Error('Unexpected') }),
    ).toBe(loaded);
    expect(historyReducer(loaded, { type: 'readSucceeded', orders: [] })).toBe(loaded);
  });
});
