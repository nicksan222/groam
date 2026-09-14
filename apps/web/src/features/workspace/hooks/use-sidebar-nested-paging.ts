import { useCallback, useMemo } from 'react';
import { SIDEBAR_NESTED_PAGE_SIZE } from '@/features/workspace/workspace-sidebar/sidebar-nested-nav';
import type { NestedListStatus } from '@/types/workspace';

export type { NestedListStatus };

export function useSidebarNestedPaging({
  canExpandVisible,
  loadMore,
  showMore,
  status,
  total
}: {
  canExpandVisible: (total: number) => boolean;
  loadMore?: (count: number) => void;
  showMore: (step?: number) => void;
  status?: NestedListStatus;
  total: number;
}) {
  const expandVisible = canExpandVisible(total);
  const canFetchMore = status === 'CanLoadMore' || status === 'LoadingMore';
  const canLoadMore = expandVisible || (Boolean(loadMore) && canFetchMore);

  const onLoadMore = useCallback(() => {
    if (expandVisible) {
      showMore();
      return;
    }
    loadMore?.(SIDEBAR_NESTED_PAGE_SIZE);
    showMore();
  }, [expandVisible, loadMore, showMore]);

  return useMemo(
    () => ({
      canFetchMore,
      canLoadMore,
      isLoadingMore: status === 'LoadingMore',
      onLoadMore
    }),
    [canFetchMore, canLoadMore, onLoadMore, status]
  );
}
