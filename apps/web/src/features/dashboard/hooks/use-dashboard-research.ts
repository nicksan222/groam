import { api } from '@groam/backend/api';
import { useQuery } from 'convex/react';
import { useMemo } from 'react';

const RESEARCH_LIMIT = 4;

/** Recent research threads across the group's trips, newest activity first. */
export function useDashboardResearch() {
  const research = useQuery(api.routes.discussions.research.workspace.run, {});
  return useMemo(
    () => ({
      isLoading: research === undefined,
      research: (research ?? []).slice(0, RESEARCH_LIMIT)
    }),
    [research]
  );
}
