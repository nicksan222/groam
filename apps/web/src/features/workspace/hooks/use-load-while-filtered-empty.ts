import { useEffect } from 'react';
import type { PaginatedListStatus } from '@/types/workspace';

/**
 * A filter can hide the whole loaded page while matches sit on later pages.
 * Keep loading until something matches or the list is exhausted; returns
 * whether more pages are still being searched.
 */
export function useLoadWhileFilteredEmpty({
  isFilteredEmpty,
  loadMore,
  pageSize = 25,
  status
}: {
  isFilteredEmpty: boolean;
  loadMore: (count: number) => void;
  pageSize?: number;
  status: PaginatedListStatus | undefined;
}) {
  const searching = isFilteredEmpty && (status === 'CanLoadMore' || status === 'LoadingMore');
  useEffect(() => {
    if (isFilteredEmpty && status === 'CanLoadMore') loadMore(pageSize);
  }, [isFilteredEmpty, loadMore, pageSize, status]);
  return searching;
}
