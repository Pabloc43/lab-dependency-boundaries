import type { Order } from '../../domain/order';

type LoadedHistory = { kind: 'loaded'; orders: readonly Order[] };
type ClearedHistory = { kind: 'cleared' };
type HistorySnapshot = LoadedHistory | ClearedHistory;

export type HistoryState =
  | { status: 'loading'; snapshot: HistorySnapshot | null }
  | { status: 'ready'; snapshot: HistorySnapshot }
  | { status: 'clearing'; snapshot: LoadedHistory | null }
  | {
      status: 'failed';
      operation: 'read';
      error: string;
      snapshot: ClearedHistory | null;
    }
  | {
      status: 'failed';
      operation: 'clear';
      error: string;
      snapshot: LoadedHistory | null;
    };

export type HistoryEvent =
  | { type: 'readStarted' }
  | { type: 'readSucceeded'; orders: readonly Order[] }
  | { type: 'readFailed'; cause: unknown }
  | { type: 'clearStarted' }
  | { type: 'clearSucceeded' }
  | { type: 'clearFailed'; cause: unknown };

export const initialHistoryState: HistoryState = { status: 'loading', snapshot: null };

function failureMessage(cause: unknown, fallback: string): string {
  if (cause instanceof Error && cause.message.trim().length > 0) {
    return cause.message;
  }

  return fallback;
}

export function historyReducer(state: HistoryState, event: HistoryEvent): HistoryState {
  switch (event.type) {
    case 'readStarted':
      // A background refresh cannot hide the outcome of a delete operation.
      if (
        state.status === 'clearing' ||
        (state.status === 'failed' && state.operation === 'clear')
      ) {
        return state;
      }

      return { status: 'loading', snapshot: state.snapshot };

    case 'readSucceeded': {
      const snapshot: HistorySnapshot = { kind: 'loaded', orders: event.orders };

      if (
        state.status === 'clearing' ||
        (state.status === 'failed' && state.operation === 'clear')
      ) {
        return { ...state, snapshot };
      }

      if (state.status !== 'loading') {
        return state;
      }

      if (event.orders.length === 0 && state.snapshot?.kind === 'cleared') {
        return { status: 'ready', snapshot: state.snapshot };
      }

      return { status: 'ready', snapshot };
    }

    case 'readFailed':
      if (state.status !== 'loading') {
        return state;
      }

      return {
        status: 'failed',
        operation: 'read',
        error: failureMessage(event.cause, 'No se pudo leer el historial.'),
        snapshot: state.snapshot?.kind === 'cleared' ? state.snapshot : null,
      };

    case 'clearStarted': {
      // A new attempt invalidates an old announcement, not the last known list.
      let snapshot = state.snapshot;

      if (snapshot?.kind === 'cleared') {
        snapshot = { kind: 'loaded', orders: [] };
      }

      return { status: 'clearing', snapshot };
    }

    case 'clearSucceeded':
      if (state.status !== 'clearing') {
        return state;
      }

      return { status: 'ready', snapshot: { kind: 'cleared' } };

    case 'clearFailed':
      if (state.status !== 'clearing') {
        return state;
      }

      return {
        status: 'failed',
        operation: 'clear',
        error: failureMessage(event.cause, 'No se pudo borrar el historial.'),
        snapshot: state.snapshot,
      };
  }
}

const noOrders: readonly Order[] = [];
const clearedNotice =
  'Se borró el historial de este lab. Los demás datos del navegador no se modificaron.';

export function historyView(state: HistoryState) {
  return {
    orders: state.snapshot?.kind === 'loaded' ? state.snapshot.orders : noOrders,
    pending: state.status === 'loading' || state.status === 'clearing',
    error: state.status === 'failed' ? state.error : '',
    notice: state.snapshot?.kind === 'cleared' ? clearedNotice : '',
  };
}
