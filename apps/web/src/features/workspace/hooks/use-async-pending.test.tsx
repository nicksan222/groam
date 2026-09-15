import { act, renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { useAsyncPending } from './use-async-pending';

describe('useAsyncPending', () => {
  test('sets pending while the action runs and clears afterward', async () => {
    const { result } = renderHook(() => useAsyncPending());
    expect(result.current.isPending).toBe(false);

    let resolve!: (value: string) => void;
    const promise = new Promise<string>((next) => {
      resolve = next;
    });

    let finished: Promise<string | undefined>;
    act(() => {
      finished = result.current.run(() => promise);
    });
    expect(result.current.isPending).toBe(true);

    await act(async () => {
      resolve('ok');
      await finished;
    });
    expect(result.current.isPending).toBe(false);
  });

  test('clears pending when the action rejects', async () => {
    const { result } = renderHook(() => useAsyncPending());
    await act(async () => {
      await expect(
        result.current.run(async () => {
          throw new Error('boom');
        })
      ).rejects.toThrow('boom');
    });
    expect(result.current.isPending).toBe(false);
  });
});
