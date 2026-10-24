import { act, renderHook } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { useTripCreateRequestStore } from '@/lib/stores/trip-create-request-store';
import { useTripCreateRequest } from './use-trip-create-request';

describe('useTripCreateRequest', () => {
  test('opens when its kind is requested, every time, and ignores other kinds', async () => {
    const open = vi.fn();
    await renderHook(() => useTripCreateRequest('issue', open));

    await act(() => useTripCreateRequestStore.getState().request('poll'));
    expect(open).not.toHaveBeenCalled();

    await act(() => useTripCreateRequestStore.getState().request('issue'));
    await act(() => useTripCreateRequestStore.getState().request('issue'));
    expect(open).toHaveBeenCalledTimes(2);
    expect(useTripCreateRequestStore.getState().requested).toBeNull();
  });
});
