import { useCallback } from 'react';
import { SIDEBAR_NESTED_PAGE_SIZE } from '@/features/workspace/workspace-sidebar/sidebar-nested-nav';
import { type SidebarSectionKey, useSidebarChromeStore } from '@/lib/stores/sidebar-chrome-store';

export function useSidebarNestedVisible(section: SidebarSectionKey) {
  const visibleCount = useSidebarChromeStore((state) => state.nestedVisibleCount(section));
  const isCreateOpen = useSidebarChromeStore((state) => state.isNestedCreateOpen(section));
  const setCreateOpen = useSidebarChromeStore((state) => state.setNestedCreateOpen);
  const setVisibleCount = useSidebarChromeStore((state) => state.setNestedVisibleCount);
  const showMoreNested = useSidebarChromeStore((state) => state.showMoreNested);

  const showMore = useCallback(
    (step = SIDEBAR_NESTED_PAGE_SIZE) => {
      showMoreNested(section, step);
    },
    [section, showMoreNested]
  );

  const canExpandVisible = useCallback((total: number) => visibleCount < total, [visibleCount]);

  return {
    canExpandVisible,
    closeCreate: () => setCreateOpen(section, false),
    isCreateOpen,
    openCreate: () => setCreateOpen(section, true),
    setCreateOpen: (open: boolean) => setCreateOpen(section, open),
    setVisibleCount: (count: number) => setVisibleCount(section, count),
    showMore,
    visibleCount
  };
}
