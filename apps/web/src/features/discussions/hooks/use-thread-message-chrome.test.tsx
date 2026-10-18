import { act, renderHook } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { useThreadMessageChrome } from './use-thread-message-chrome';

describe('useThreadMessageChrome', () => {
  test('closes the menu when the picker opens and vice versa', async () => {
    const { result } = await renderHook(() => useThreadMessageChrome());

    await act(() => {
      result.current.setMenuOpen(true);
    });
    expect(result.current.menuOpen).toBe(true);
    expect(result.current.chromeOpen).toBe(true);

    await act(() => {
      result.current.setPickerOpen(true);
    });
    expect(result.current.pickerOpen).toBe(true);
    expect(result.current.menuOpen).toBe(false);
    expect(result.current.chromeOpen).toBe(true);

    await act(() => {
      result.current.setMenuOpen(true);
    });
    expect(result.current.menuOpen).toBe(true);
    expect(result.current.pickerOpen).toBe(false);
    expect(result.current.chromeOpen).toBe(true);
  });
});
