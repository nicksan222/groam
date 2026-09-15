import { api } from '@groam/backend/api';
import { usePaginatedQuery } from 'convex/react';
import type { WorkspaceAgentRun } from '@/types/agents';

export type { WorkspaceAgentRun };

export function useWorkspaceAgentRuns(options?: { initialNumItems?: number } | 'skip') {
  const skip = options === 'skip';
  const { results, status, loadMore } = usePaginatedQuery(
    api.routes.agents.runs.workspace.run,
    skip ? 'skip' : {},
    { initialNumItems: skip ? 25 : (options?.initialNumItems ?? 25) }
  );
  return {
    isLoading: status === 'LoadingFirstPage',
    loadMore,
    runs: results,
    status
  };
}
