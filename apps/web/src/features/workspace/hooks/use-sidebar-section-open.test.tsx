import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { resetSidebarChromeStore } from '@/lib/stores/sidebar-chrome-store';
import { useSidebarSectionOpen } from './use-sidebar-section-open';

beforeEach(() => resetSidebarChromeStore());

describe('useSidebarSectionOpen', () => {
  test('reads and updates only the requested sidebar section', () => {
    const trips = renderHook(() => useSidebarSectionOpen('trips'));
    const ideas = renderHook(() => useSidebarSectionOpen('ideas'));

    expect(trips.result.current[0]).toBe(false);
    act(() => trips.result.current[1](true));
    expect(trips.result.current[0]).toBe(true);
    expect(ideas.result.current[0]).toBe(false);

    act(() => trips.result.current[1](false));
    expect(trips.result.current[0]).toBe(false);
  });
});
