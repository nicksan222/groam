import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { SIDEBAR_NESTED_PAGE_SIZE } from '@/features/workspace/workspace-sidebar/sidebar-nested-nav';
import { resetSidebarChromeStore } from '@/lib/stores/sidebar-chrome-store';
import { useSidebarNestedVisible } from './use-sidebar-nested-visible';

describe('useSidebarNestedVisible', () => {
  beforeEach(() => {
    resetSidebarChromeStore();
  });

  test('tracks create open and visible count expansion', () => {
    const { result } = renderHook(() => useSidebarNestedVisible('ideas'));
    expect(result.current.isCreateOpen).toBe(false);
    expect(result.current.visibleCount).toBe(SIDEBAR_NESTED_PAGE_SIZE);
    expect(result.current.canExpandVisible(SIDEBAR_NESTED_PAGE_SIZE + 3)).toBe(true);

    act(() => {
      result.current.openCreate();
      result.current.showMore(3);
    });
    expect(result.current.isCreateOpen).toBe(true);
    expect(result.current.visibleCount).toBe(SIDEBAR_NESTED_PAGE_SIZE + 3);
    expect(result.current.canExpandVisible(SIDEBAR_NESTED_PAGE_SIZE + 3)).toBe(false);
  });
});
