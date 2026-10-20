import { api } from '@groam/backend/api';
import { usePaginatedQuery } from 'convex/react';
import { useCallback, useMemo } from 'react';

const PAGE_SIZE = 4;

/** Keep candidate-page continuation even when every current result is hidden. */
export function useDashboardPolls() {
  const page = usePaginatedQuery(
    api.routes.polls.list.open.page.run,
    {},
    { initialNumItems: PAGE_SIZE }
  );
  const loadMore = useCallback(() => {
    if (page.status === 'CanLoadMore') page.loadMore(PAGE_SIZE);
  }, [page]);
  return useMemo(
    () => ({
      canLoadMore: page.status === 'CanLoadMore',
      isLoadingMore: page.status === 'LoadingMore',
      isLoading: page.status === 'LoadingFirstPage',
      loadMore,
      polls: page.results.filter((poll) => !poll.viewerHasVoted)
    }),
    [loadMore, page.results, page.status]
  );
}
