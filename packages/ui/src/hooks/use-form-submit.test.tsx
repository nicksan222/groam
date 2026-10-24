import { act, renderHook } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import type { ActionOutcome } from './use-async-action';
import { useFormSubmit } from './use-form-submit';

describe('useFormSubmit', () => {
  test('tracks pending and resolves to the action result', async () => {
    const { result } = await renderHook(() => useFormSubmit());
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

  test('ignores a second submit while one is in flight', async () => {
    const { result } = await renderHook(() => useFormSubmit());
    const action = vi.fn(() => new Promise<void>(() => {}));
    await act(() => {
      void result.current.run(action);
      void result.current.run(action);
    });
    expect(action).toHaveBeenCalledTimes(1);
  });

  test('captures a thrown error as a message and clears it on the next run', async () => {
    const { result } = await renderHook(() => useFormSubmit({ fallbackError: 'Could not save' }));
    const first = await act(() =>
      result.current.run(() => Promise.reject(new Error('Name taken')))
    );
    expect(first).toEqual({ status: 'error' });
    expect(result.current.error).toBe('Name taken');
    await act(() => result.current.run(() => Promise.reject({})));
    expect(result.current.error).toBe('Could not save');
    await act(() => result.current.run(() => Promise.resolve()));
    expect(result.current.error).toBeNull();
  });

  test('handle prevents the browser submit before running', async () => {
    const { result } = await renderHook(() => useFormSubmit());
    const preventDefault = vi.fn();
    const action = vi.fn(() => Promise.resolve());
    await act(() => result.current.handle(action)({ preventDefault } as never));
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(action).toHaveBeenCalledOnce();
  });
});
