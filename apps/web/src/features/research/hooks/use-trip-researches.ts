import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { useQuery } from 'convex/react';
import type { ResearchSummary } from '@/types/research';

export function useTripResearches(tripId: Id<'trips'> | undefined) {
  const researches = useQuery(
    api.routes.discussions.research.list.run,
    tripId ? { kind: 'research', tripId } : 'skip'
  );
  return {
    isLoading: tripId !== undefined && researches === undefined,
    researches: (researches ?? []) satisfies ResearchSummary[]
  };
}
