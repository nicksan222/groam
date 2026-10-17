import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { useQuery } from 'convex/react';
import { useMemo } from 'react';
import { useTripIssues } from '@/features/trips/hooks/use-trip-issues';
import { useTripVersions } from '@/features/trips/hooks/use-trip-versions';
import type { LinkTargetOption, ResearchLink } from '@/types/research';

/** Everything in a trip a research can point at, minus what is already linked. */
export function useResearchLinkOptions(tripId: Id<'trips'>, linked: ResearchLink[]) {
  const { issues } = useTripIssues(tripId);
  const { proposals } = useTripVersions(tripId);
  const trip = useQuery(api.routes.trips.find.run, { tripId });

  const options = useMemo(() => {
    const taken = new Set(linked.map((link) => `${link.target.kind}:${link.target.id}`));
    const all: LinkTargetOption[] = [
      ...(issues ?? []).map((issue) => ({
        group: 'Issues',
        label: issue.title,
        target: { id: issue.id, kind: 'issue' as const }
      })),
      ...(proposals ?? []).map((proposal) => ({
        group: 'Ideas',
        label: proposal.title,
        target: { id: proposal.id, kind: 'idea' as const }
      })),
      ...(trip?.destinations ?? []).flatMap((destination) => [
        {
          group: 'Destinations',
          label: destination.name,
          target: { id: destination.id, kind: 'destination' as const }
        },
        ...destination.activities.map((activity) => ({
          group: 'Activities',
          label: activity.title,
          target: { id: activity.id, kind: 'activity' as const }
        })),
        ...(destination.stays ?? []).map((stay) => ({
          group: 'Stays',
          label: stay.title,
          target: { id: stay.id, kind: 'stay' as const }
        }))
      ])
    ];
    return all.filter((option) => !taken.has(`${option.target.kind}:${option.target.id}`));
  }, [issues, linked, proposals, trip]);

  return { options };
}
