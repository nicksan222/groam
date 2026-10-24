import { act, renderHook } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { type ActionOutcome, useAsyncAction } from './use-async-action';

describe('useAsyncAction', () => {
  test('tracks pending and resolves to the action result', async () => {
    const { result } = await renderHook(() => useAsyncAction());
    let release: (value: string) => void = () => {};
    let outcome: Promise<ActionOutcome<string>> = Promise.resolve({ status: 'ignored' });
    await act(() => {
      outcome = result.current.run(() => new Promise<string>((resolve) => (release = resolve)));
    });
    expect(result.current.isPending).toBe(true);
    await act(async () => {
      release('done');
      await outcome;
    });
    expect(await outcome).toEqual({ status: 'ok', value: 'done' });
    expect(result.current.isPending).toBe(false);
  });

  test('ignores a second call while one is in flight, then runs again once settled', async () => {
    const { result } = await renderHook(() => useAsyncAction());
    const action = vi.fn(() => Promise.resolve());
    await act(() => {
      void result.current.run(action);
      void result.current.run(action);
    });
    expect(action).toHaveBeenCalledTimes(1);
    await act(() => result.current.run(action));
    expect(action).toHaveBeenCalledTimes(2);
  });

  test('captures a thrown error as a message and clears it on the next run', async () => {
    const { result } = await renderHook(() => useAsyncAction({ fallbackError: 'Could not retry' }));
    const first = await act(() =>
      result.current.run(() => Promise.reject(new Error('Run is gone')))
    );
    expect(first).toEqual({ status: 'error' });
    expect(result.current.error).toBe('Run is gone');
    await act(() => result.current.run(() => Promise.reject({})));
    expect(result.current.error).toBe('Could not retry');
    await act(() => result.current.run(() => Promise.resolve()));
    expect(result.current.error).toBeNull();
    expect(result.current.isPending).toBe(false);
  });

  test('reports a thrown error to onError', async () => {
    const onError = vi.fn();
    const { result } = await renderHook(() => useAsyncAction({ onError }));
    await act(() => result.current.run(() => Promise.reject(new Error('Run is gone'))));
    expect(onError).toHaveBeenCalledExactlyOnceWith('Run is gone');
  });

  test('tells an ignored call apart from a failure and from an undefined result', async () => {
    const { result } = await renderHook(() => useAsyncAction());
    let release: () => void = () => {};
    let first: Promise<ActionOutcome<void>> = Promise.resolve({ status: 'ignored' });
    const skipped = vi.fn(() => Promise.resolve());
    await act(() => {
      first = result.current.run(() => new Promise<void>((resolve) => (release = resolve)));
    });
    expect(await act(() => result.current.run(skipped))).toEqual({ status: 'ignored' });
    expect(skipped).not.toHaveBeenCalled();
    await act(async () => {
      release();
      await first;
    });
    expect(await first).toEqual({ status: 'ok', value: undefined });
  });

  test('keeps run and setError identical across renders and reads the latest onError', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = await renderHook(
      ({ onError }: { onError: (message: string) => void }) => useAsyncAction({ onError }),
      { initialProps: { onError: first } }
    );
    const { run, setError } = result.current;
    await rerender({ onError: second });
    expect(result.current.run).toBe(run);
    expect(result.current.setError).toBe(setError);
    await act(() => result.current.run(() => Promise.reject(new Error('nope'))));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledExactlyOnceWith('nope');
  });
});
