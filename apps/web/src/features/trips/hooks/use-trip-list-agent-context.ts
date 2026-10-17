import { useSetAgentContext } from '@groam/ai/ui/context/agent-context';
import type { TripListItem } from '@/features/trips/hooks/use-trips';

export function useTripListAgentContext({
  activeGroup,
  proposalCounts,
  trips
}: {
  activeGroup: string;
  proposalCounts: Map<TripListItem['id'], unknown[]>;
  trips: TripListItem[];
}) {
  useSetAgentContext({
    capabilities: ['trip.create'],
    data: {
      activeGroup,
      trips: trips.map((trip) => ({
        archived: trip.archivedAt !== null,
        dateNotes: trip.dateNotes,
        destination: trip.destination,
        id: trip.id,
        name: trip.name,
        nextAction: trip.nextAction,
        proposalCount: proposalCounts.get(trip.id)?.length ?? 0
      }))
    },
    description: 'Summarize the visible trip portfolio and help choose what to plan next.',
    key: 'trips:list',
    title: 'Trips'
  });
}
