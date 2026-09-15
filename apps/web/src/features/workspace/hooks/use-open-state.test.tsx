import { act, renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { useOpenState } from './use-open-state';

describe('useOpenState', () => {
  test('opens, closes, and toggles a boolean', () => {
    const { result } = renderHook(() => useOpenState());
    expect(result.current.open).toBe(false);

    act(() => {
      result.current.openPanel();
    });
    expect(result.current.open).toBe(true);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.open).toBe(false);

    act(() => {
      result.current.setOpen(true);
      result.current.closePanel();
    });
    expect(result.current.open).toBe(false);
  });
});
