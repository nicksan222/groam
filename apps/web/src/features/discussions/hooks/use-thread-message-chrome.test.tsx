import { act, renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { useThreadMessageChrome } from './use-thread-message-chrome';

describe('useThreadMessageChrome', () => {
  test('closes the menu when the picker opens and vice versa', () => {
    const { result } = renderHook(() => useThreadMessageChrome());

    act(() => {
      result.current.setMenuOpen(true);
    });
    expect(result.current.menuOpen).toBe(true);
    expect(result.current.chromeOpen).toBe(true);

    act(() => {
      result.current.setPickerOpen(true);
    });
    expect(result.current.pickerOpen).toBe(true);
    expect(result.current.menuOpen).toBe(false);
    expect(result.current.chromeOpen).toBe(true);

    act(() => {
      result.current.setMenuOpen(true);
    });
    expect(result.current.menuOpen).toBe(true);
    expect(result.current.pickerOpen).toBe(false);
    expect(result.current.chromeOpen).toBe(true);
  });
});
