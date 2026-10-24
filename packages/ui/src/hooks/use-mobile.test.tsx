import { renderHook } from '@groam/vitest-config/react';
import { afterEach, describe, expect, test, vi } from 'vite-plus/test';
import { useIsMobile, useIsNarrow } from './use-mobile';

/** A viewport of the given width: `(max-width: Npx)` queries match when the width is within N. */
function stubViewport(width: number) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    addEventListener: vi.fn(),
    matches: width <= Number(/max-width: (\d+)px/u.exec(query)?.[1]),
    media: query,
    removeEventListener: vi.fn()
  }));
}

afterEach(() => vi.unstubAllGlobals());

describe('viewport hooks', () => {
  test.each([
    [500, true, true],
    [900, true, false],
    [1200, false, false]
  ])('at %ipx: narrow %s, mobile %s', async (width, narrow, mobile) => {
    stubViewport(width);
    const narrowHook = await renderHook(() => useIsNarrow());
    const mobileHook = await renderHook(() => useIsMobile());
    expect(narrowHook.result.current).toBe(narrow);
    expect(mobileHook.result.current).toBe(mobile);
  });
});
