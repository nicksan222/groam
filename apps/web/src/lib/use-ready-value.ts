import { useEffect, useRef } from 'react';

/**
 * Latches the first ready value so transient `undefined` (refetch, re-subscribe)
 * cannot flip the UI back to its loading state. `resetKey` is the only thing that
 * starts a new loading cycle.
 */
export function useReadyValue<T>(
  value: T | undefined,
  resetKey = ''
): { isLoading: boolean; value: T | undefined } {
  const latched = useRef<{ key: string; value: T | undefined }>({
    key: resetKey,
    value: undefined
  });

  useEffect(() => {
    if (value !== undefined) {
      latched.current = { key: resetKey, value };
      return;
    }
    if (latched.current.key !== resetKey) {
      latched.current = { key: resetKey, value: undefined };
    }
  }, [resetKey, value]);

  const readyValue =
    value !== undefined
      ? value
      : latched.current.key === resetKey
        ? latched.current.value
        : undefined;

  return {
    isLoading: readyValue === undefined,
    value: readyValue
  };
}
