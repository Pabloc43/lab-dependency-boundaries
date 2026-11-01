import { describe, expect, it } from 'vitest';
import type { Order } from '../../domain/order';
import { OrderValidationError } from '../../domain/order';
import {
  initialSubmissionState,
  submissionReducer,
  submissionView,
  type SubmissionState,
  type SubmissionEvent,
} from './submission-state';

const order: Order = {
  id: 'one',
  lines: [{ productId: 'notebook', name: 'Notebook', quantity: 1, unitPriceCents: 100 }],
  totalCents: 100,
};
const pending: SubmissionState = { status: 'pending' };
const success: SubmissionState = { status: 'success', order };
const failed: SubmissionState = { status: 'error', message: 'Validation failed' };

describe('order submission process', () => {
  it('starts idle without a pending operation, result or error', () => {
    expect(submissionView(initialSubmissionState)).toEqual({
      pending: false,
      order: null,
      error: '',
    });
  });

  it.each([initialSubmissionState, success, failed])(
    'starts a new attempt from $status without stale results',
    (state) => {
      const started = submissionReducer(state, { type: 'started' });

      expect(started).toEqual(pending);
      expect(submissionView(started)).toEqual({ pending: true, order: null, error: '' });
    },
  );

  it('does not restart an already pending attempt', () => {
    expect(submissionReducer(pending, { type: 'started' })).toBe(pending);
  });

  it('completes successfully with only the resulting order', () => {
    const completed = submissionReducer(pending, { type: 'succeeded', order });

    expect(completed).toEqual(success);
    expect(submissionView(completed)).toEqual({ pending: false, order, error: '' });
  });

  it('completes a failure without a result and uses the existing error policy', () => {
    const completed = submissionReducer(pending, {
      type: 'failed',
      cause: new OrderValidationError('Validation failed'),
    });

    expect(completed).toEqual(failed);
    expect(submissionView(completed)).toEqual({
      pending: false,
      order: null,
      error: 'Validation failed',
    });
  });

  it.each([new Error(''), new Error('   '), null])(
    'never completes with an empty error message: %s',
    (cause) => {
      const completed = submissionReducer(pending, { type: 'failed', cause });

      expect(submissionView(completed)).toEqual({
        pending: false,
        order: null,
        error: 'No se pudo guardar el pedido. Intenta nuevamente.',
      });
    },
  );

  it('dismisses only a success and keeps errors or active attempts intact', () => {
    expect(submissionReducer(success, { type: 'dismissed' })).toEqual(
      initialSubmissionState,
    );

    for (const state of [initialSubmissionState, pending, failed]) {
      expect(submissionReducer(state, { type: 'dismissed' })).toBe(state);
    }
  });

  it.each([initialSubmissionState, success, failed])(
    'ignores completions outside a pending attempt: $status',
    (state) => {
      expect(submissionReducer(state, { type: 'succeeded', order })).toBe(state);
      expect(
        submissionReducer(state, { type: 'failed', cause: new Error('Unexpected') }),
      ).toBe(state);
    },
  );
});

// Compilation contracts only: invalid values are never sent to the runtime reducer.
const validSuccess: SubmissionEvent<'succeeded'> = { type: 'succeeded', order };
const validFailure: SubmissionEvent<'failed'> = {
  type: 'failed',
  cause: new Error('Failure'),
};
// @ts-expect-error A successful event requires its order payload.
const missingOrder: SubmissionEvent = { type: 'succeeded' };
// @ts-expect-error A failed event requires its cause, even though that value may be unknown.
const missingCause: SubmissionEvent = { type: 'failed' };
// @ts-expect-error The success payload cannot be attached to a started event.
const mismatchedPayload: SubmissionEvent = { type: 'started', order };
const extraPayload: SubmissionEvent = {
  type: 'succeeded',
  order,
  // @ts-expect-error A succeeded event does not accept a cause payload.
  cause: new Error('Failure'),
};
// @ts-expect-error A dismissed event has no payload.
const dismissedPayload: SubmissionEvent = { type: 'dismissed', cause: null };
// @ts-expect-error The mapped event key remains correlated to its payload.
const wrongDiscriminant: SubmissionEvent<'failed'> = { type: 'succeeded', order };
const invalidReducerEvent: Parameters<typeof submissionReducer>[1] = {
  type: 'failed',
  // @ts-expect-error The reducer parameter exposes the same discriminated event union.
  order,
};

void [
  validSuccess,
  validFailure,
  missingOrder,
  missingCause,
  mismatchedPayload,
  extraPayload,
  dismissedPayload,
  wrongDiscriminant,
  invalidReducerEvent,
];

const states: readonly SubmissionState[] = [
  initialSubmissionState,
  pending,
  success,
  failed,
];
const transitionCases: readonly {
  event: SubmissionEvent;
  expected: Record<SubmissionState['status'], SubmissionState>;
}[] = [
  {
    event: { type: 'started' },
    expected: { idle: pending, pending, success: pending, error: pending },
  },
  {
    event: validSuccess,
    expected: { idle: initialSubmissionState, pending: success, success, error: failed },
  },
  {
    event: { type: 'failed', cause: new OrderValidationError('Validation failed') },
    expected: { idle: initialSubmissionState, pending: failed, success, error: failed },
  },
  {
    event: { type: 'dismissed' },
    expected: {
      idle: initialSubmissionState,
      pending,
      success: initialSubmissionState,
      error: failed,
    },
  },
];

it.each(
  states.flatMap((state) =>
    transitionCases.map(({ event, expected }) => ({
      state,
      event,
      expected: expected[state.status],
    })),
  ),
)(
  'preserves transition $state.status → $event.type and no-op identity',
  ({ state, event, expected }) => {
    const next = submissionReducer(state, event);

    expect(next).toEqual(expected);
    if (expected === state) {
      expect(next).toBe(state);
    }
  },
);
