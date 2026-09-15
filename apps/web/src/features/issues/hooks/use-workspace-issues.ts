import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { toast } from '@groam/ui/components/toast';
import { useMutation, usePaginatedQuery } from 'convex/react';
import { useCallback } from 'react';
import { errorMessage } from '@/lib/errors';
import type { WorkspaceIssue } from '@/types/issues';

export type { WorkspaceIssue };

export function useWorkspaceIssues(options?: { initialNumItems?: number } | 'skip') {
  const skip = options === 'skip';
  const { loadMore, results, status } = usePaginatedQuery(
    api.routes.trips.issues.workspace.list.run,
    skip ? 'skip' : {},
    { initialNumItems: skip ? 25 : (options?.initialNumItems ?? 25) }
  );
  return {
    isLoading: status === 'LoadingFirstPage',
    issues: results,
    loadMore,
    status
  };
}

export function useCreateIssue() {
  const createMutation = useMutation(api.routes.trips.issues.create.run);
  return useCallback(
    async (tripId: Id<'trips'>, title: string, body: string) => {
      try {
        return await createMutation({ body, title, tripId });
      } catch (error: unknown) {
        toast.error(errorMessage(error, 'Unable to create trip issue'));
        return null;
      }
    },
    [createMutation]
  );
}
