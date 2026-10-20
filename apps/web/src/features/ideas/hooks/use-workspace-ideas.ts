import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { toast } from '@groam/ui/components/toast';
import { useMutation, usePaginatedQuery } from 'convex/react';
import { useCallback } from 'react';
import { errorMessage } from '@/lib/errors';
import type { WorkspaceIdea } from '@/types/ideas';

export type { WorkspaceIdea };

export function useWorkspaceIdeas(options?: { initialNumItems?: number } | 'skip') {
  const skip = options === 'skip';
  const { loadMore, results, status } = usePaginatedQuery(
    api.routes.trips.versions.workspace.list.run,
    skip ? 'skip' : {},
    { initialNumItems: skip ? 25 : (options?.initialNumItems ?? 25) }
  );
  return {
    isLoading: status === 'LoadingFirstPage',
    loadMore,
    proposals: results,
    status
  };
}

export function useViewerOpenIdeas(options?: 'skip') {
  const query = usePaginatedQuery(
    api.routes.trips.versions.workspace.pending.page.run,
    options === 'skip' ? 'skip' : {},
    { initialNumItems: 50 }
  );
  return {
    isLoading: options !== 'skip' && query.status === 'LoadingFirstPage',
    proposals: query.results,
    canLoadMore: options !== 'skip' && query.status === 'CanLoadMore',
    isLoadingMore: options !== 'skip' && query.status === 'LoadingMore',
    loadMore: () => {
      if (options !== 'skip' && query.status === 'CanLoadMore') query.loadMore(50);
    }
  };
}

export function useCreateIdea() {
  const createMutation = useMutation(api.routes.trips.versions.create.run);
  return useCallback(
    async (tripId: Id<'trips'>, title?: string) => {
      try {
        return await createMutation(title ? { title, tripId } : { tripId });
      } catch (error: unknown) {
        toast.error(errorMessage(error, 'Unable to start an idea'));
        return null;
      }
    },
    [createMutation]
  );
}
