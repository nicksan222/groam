import { act, renderHook } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { useOpenState } from './use-open-state';

describe('useOpenState', () => {
  test('opens, closes, and toggles a boolean', async () => {
    const { result } = await renderHook(() => useOpenState());
    expect(result.current.open).toBe(false);

    await act(() => {
      result.current.openPanel();
    });
    expect(result.current.open).toBe(true);

    await act(() => {
      result.current.toggle();
    });
    expect(result.current.open).toBe(false);

    await act(() => {
      result.current.setOpen(true);
      result.current.closePanel();
    });
    expect(result.current.open).toBe(false);
  });
});
