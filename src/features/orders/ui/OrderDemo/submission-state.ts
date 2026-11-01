import type { Order } from '../../domain/order';
import { orderSubmissionErrorMessage } from './order-submission-error';

export type SubmissionState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'success'; order: Order }
  | { status: 'error'; message: string };

interface SubmissionPayloads {
  started: Record<never, never>;
  succeeded: { order: Order };
  failed: { cause: unknown };
  dismissed: Record<never, never>;
}

export type SubmissionEvent<
  K extends keyof SubmissionPayloads = keyof SubmissionPayloads,
> = {
  [P in K]: { type: P } & SubmissionPayloads[P];
}[K];

type SubmissionHandlers = {
  [K in keyof SubmissionPayloads]: (
    state: SubmissionState,
    event: SubmissionEvent<K>,
  ) => SubmissionState;
};

export const initialSubmissionState: SubmissionState = { status: 'idle' };

const submissionHandlers: SubmissionHandlers = {
  started(state) {
    if (state.status === 'pending') {
      return state;
    }

    return { status: 'pending' };
  },
  succeeded(state, event) {
    if (state.status !== 'pending') {
      return state;
    }

    return { status: 'success', order: event.order };
  },
  failed(state, event) {
    if (state.status !== 'pending') {
      return state;
    }

    return { status: 'error', message: orderSubmissionErrorMessage(event.cause) };
  },
  dismissed(state) {
    if (state.status !== 'success') {
      return state;
    }

    return initialSubmissionState;
  },
};

export function submissionReducer<K extends keyof SubmissionPayloads>(
  state: SubmissionState,
  event: SubmissionEvent<K>,
): SubmissionState {
  return submissionHandlers[event.type](state, event);
}

export function submissionView(state: SubmissionState) {
  return {
    pending: state.status === 'pending',
    order: state.status === 'success' ? state.order : null,
    error: state.status === 'error' ? state.message : '',
  };
}
