import { act, renderHook } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test } from 'vite-plus/test';
import { resetSidebarChromeStore } from '@/lib/stores/sidebar-chrome-store';
import { useSidebarSectionOpen } from './use-sidebar-section-open';

beforeEach(() => {
  resetSidebarChromeStore();
});

describe('useSidebarSectionOpen', () => {
  test('reads and updates only the requested sidebar section', async () => {
    const trips = await renderHook(() => useSidebarSectionOpen('trips'));
    const ideas = await renderHook(() => useSidebarSectionOpen('ideas'));

    expect(trips.result.current[0]).toBe(false);
    await act(() => trips.result.current[1](true));
    expect(trips.result.current[0]).toBe(true);
    expect(ideas.result.current[0]).toBe(false);

    await act(() => trips.result.current[1](false));
    expect(trips.result.current[0]).toBe(false);
  });
});
