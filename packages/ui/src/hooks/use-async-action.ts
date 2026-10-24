import { errorMessage } from '@groam/ui/lib/errors';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * How one `run` ended. Tell `ignored` (a call made while another was in flight, so nothing ran)
 * apart from `error` (it threw: `error` is the thrown value, for a caller that must rethrow or
 * inspect it, and `message` is what the hook holds and `onError` received) and `ok` (its `value`
 * may itself be `undefined`). Restore a draft only on `error`, never on `ignored`.
 */
export type ActionOutcome<T> =
  | { status: 'error'; error: unknown; message: string }
  | { status: 'ignored' }
  | { status: 'ok'; value: T };

export type AsyncAction = {
  /** The last failure: a thrown error's message, or whatever `setError` was given. */
  error: null | string;
  isPending: boolean;
  /**
   * Runs one action at a time: a second call while one is in flight is ignored, and its thunk is
   * never called. Clears the error first and captures a throw as `error`. Pass a thunk
   * (`run(() => request())`), never a promise that has already started. Stable across renders.
   */
  run: <T>(action: () => Promise<T>) => Promise<ActionOutcome<T>>;
  /** For validation messages and failures reported as values rather than throws. Stable. */
  setError: (error: null | string) => void;
};

export type UseAsyncActionOptions = {
  /** Shown when a thrown error carries no readable message. */
  fallbackError?: string;
  /** Called with the message when an action throws, e.g. to toast it from a button with no field. */
  onError?: (message: string) => void;
};

/**
 * Pending, double-call guard, and error capture for one async action at a time — a retry, rerun,
 * stop, or send button. A form uses `useFormSubmit`, which builds on this.
 */
export function useAsyncAction({
  fallbackError = 'Something went wrong. Try again.',
  onError
}: UseAsyncActionOptions = {}): AsyncAction {
  const [isPending, setPending] = useState(false);
  const [error, setError] = useState<null | string>(null);
  // State lags a render behind; the ref stops a double click from running twice.
  const inFlight = useRef(false);
  // `run` reads the latest options through a ref so its identity never changes.
  const options = useRef({ fallbackError, onError });
  useEffect(() => {
    options.current = { fallbackError, onError };
  });

  const run = useCallback(async <T>(action: () => Promise<T>): Promise<ActionOutcome<T>> => {
    if (inFlight.current) return { status: 'ignored' };
    inFlight.current = true;
    setPending(true);
    setError(null);
    try {
      return { status: 'ok', value: await action() };
    } catch (caught: unknown) {
      const message = errorMessage(caught, options.current.fallbackError);
      setError(message);
      options.current.onError?.(message);
      return { status: 'error', error: caught, message };
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }, []);

  return { error, isPending, run, setError };
}
