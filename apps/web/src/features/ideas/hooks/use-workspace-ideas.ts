import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { toast } from '@groam/ui/components/toast';
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
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
  const proposals = useQuery(
    api.routes.trips.versions.workspace.pending.run,
    options === 'skip' ? 'skip' : {}
  );
  return {
    isLoading: proposals === undefined,
    proposals: proposals ?? []
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
