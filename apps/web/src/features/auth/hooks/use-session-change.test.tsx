import { act, renderHook } from '@groam/vitest-config/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { useSessionChange } from './use-session-change';

const convexAuth = vi.hoisted(() => ({ isAuthenticated: true, isLoading: false }));

vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  useConvexAuth: () => convexAuth
}));

beforeEach(() => {
  convexAuth.isAuthenticated = true;
  convexAuth.isLoading = false;
});

afterEach(() => {
  document.body.replaceChildren();
});

describe('useSessionChange', () => {
  test('shows the workspace again when the request returns an error', async () => {
    const { result } = await renderHook(() => useSessionChange());

    await act(async () => {
      const outcome = await result.current.changeSession(async () => ({
        error: { message: 'no' }
      }));
      expect(outcome.error).toEqual({ message: 'no' });
    });

    expect(result.current.isChangingSession).toBe(false);
  });

  test('shows the workspace again and rethrows when the request throws', async () => {
    const { result } = await renderHook(() => useSessionChange());
    const failure = new Error('offline');

    await act(async () => {
      await expect(
        result.current.changeSession(async () => {
          throw failure;
        })
      ).rejects.toBe(failure);
    });

    expect(result.current.isChangingSession).toBe(false);
  });

  test('hides the workspace while the request runs', async () => {
    const { result } = await renderHook(() => useSessionChange());
    let finish: (value: { error: null }) => void = () => {};
    const request = new Promise<{ error: null }>((resolve) => {
      finish = resolve;
    });

    let pending: Promise<unknown> = Promise.resolve();
    await act(async () => {
      pending = result.current.changeSession(() => request);
    });
    expect(result.current.isChangingSession).toBe(true);

    await act(async () => {
      finish({ error: null });
      await pending;
    });
  });

  test('stays hidden after success until Convex starts loading', async () => {
    const { rerender, result } = await renderHook(() => useSessionChange());

    await act(async () => {
      await result.current.changeSession(async () => ({ error: null }));
    });
    expect(result.current.isChangingSession).toBe(true);

    convexAuth.isLoading = true;
    await act(async () => {
      await rerender();
    });
    expect(result.current.isChangingSession).toBe(false);
  });

  test('stays hidden after success until Convex reports no session', async () => {
    const { rerender, result } = await renderHook(() => useSessionChange());

    await act(async () => {
      await result.current.changeSession(async () => ({ error: null }));
    });
    expect(result.current.isChangingSession).toBe(true);

    convexAuth.isAuthenticated = false;
    await act(async () => {
      await rerender();
    });
    expect(result.current.isChangingSession).toBe(false);
  });

  test('returns focus to the control that started a failed request', async () => {
    const button = document.createElement('button');
    document.body.append(button);
    button.focus();
    const { result } = await renderHook(() => useSessionChange());

    button.blur();
    await act(async () => {
      button.focus();
      await result.current.changeSession(async () => ({ error: { message: 'no' } }));
    });

    expect(document.activeElement).toBe(button);
  });
});
