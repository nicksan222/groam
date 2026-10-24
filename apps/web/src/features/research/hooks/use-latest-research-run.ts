import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { useQuery } from 'convex/react';

export function useLatestResearchRun(discussionId: Id<'discussions'>) {
  return useQuery(api.routes.discussions.research.latest.run, { discussionId });
}
