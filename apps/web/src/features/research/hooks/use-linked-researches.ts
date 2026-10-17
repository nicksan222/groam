import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { useQuery } from 'convex/react';
import type { ResearchLinkTarget } from '@/types/research';
import { toBackendTarget } from './research-link-target';
import { useTripResearches } from './use-trip-researches';

/** Researches of a trip split into those linked to one issue or idea and those still available. */
export function useLinkedResearches(tripId: Id<'trips'> | undefined, target: ResearchLinkTarget) {
  const { researches } = useTripResearches(tripId);
  const linkedRows = useQuery(
    api.routes.discussions.research.links.target.run,
    tripId ? { target: toBackendTarget(target) } : 'skip'
  );
  const linkedIds = new Set((linkedRows ?? []).map((row) => row.id));
  return {
    available: researches.filter((research) => !linkedIds.has(research.id as Id<'discussions'>)),
    isLoading: tripId === undefined || linkedRows === undefined,
    linked: researches.filter((research) => linkedIds.has(research.id as Id<'discussions'>))
  };
}
