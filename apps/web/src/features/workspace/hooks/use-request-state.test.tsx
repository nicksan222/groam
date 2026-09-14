import { act, renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { useRequestState } from './use-request-state';

describe('useRequestState', () => {
  test('tracks pending and error without rerender loops', () => {
    const { result } = renderHook(() => useRequestState());
    const [initialRequest] = result.current;

    expect(initialRequest).toEqual({ error: null, isPending: false });

    act(() => {
      result.current[1]({ error: 'Something failed', isPending: false });
    });

    expect(result.current[0]).toEqual({ error: 'Something failed', isPending: false });
    expect(result.current[0]).not.toBe(initialRequest);
  });
});
