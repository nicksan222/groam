import { act, renderHook } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { useRequestState } from './use-request-state';

describe('useRequestState', () => {
  test('tracks pending and error without rerender loops', async () => {
    const { result } = await renderHook(() => useRequestState());
    const [initialRequest] = result.current;

    expect(initialRequest).toEqual({ error: null, isPending: false });

    await act(() => {
      result.current[1]({ error: 'Something failed', isPending: false });
    });

    expect(result.current[0]).toEqual({ error: 'Something failed', isPending: false });
    expect(result.current[0]).not.toBe(initialRequest);
  });
});
