import type { AgentScreenContext } from '@groam/ai/ui/context/agent-context';
import { HOME_TRIP_LIMIT } from '@/features/dashboard/hooks/dashboard-model';
import type { TripListItem } from '@/features/trips/hooks/use-trips';
import type { TripsTurn } from '@/types/dashboard';

/**
 * The home's screen context: the trips on show (the first `HOME_TRIP_LIMIT`, as the page lists them) and, once it has loaded, what waits on the viewer
 * in each. `turn` is omitted while it loads or when it could not be read.
 */
export function buildDashboardContext({
  groupName,
  trips,
  turn
}: {
  groupName: string;
  trips: readonly TripListItem[];
  turn?: TripsTurn | null;
}): AgentScreenContext {
  const counts = new Map(turn?.trips.map((entry) => [entry.tripId, entry]));
  return {
    capabilities: [],
    data: {
      groupName,
      trips: trips.slice(0, HOME_TRIP_LIMIT).map((trip) => {
        const waiting = counts.get(trip.id);
        return {
          id: trip.id,
          name: trip.name,
          nextAction: trip.nextAction,
          ...(waiting
            ? {
                waitingOnYou: { ideas: waiting.ideas, issues: waiting.issues, polls: waiting.polls }
              }
            : {})
        };
      }),
      ...(turn
        ? {
            waitingOnYou: turn.items.map((item) => ({
              id: item.id,
              kind: item.kind,
              title: item.title,
              trip: item.tripName
            })),
            waitingOnYouTotal: turn.total,
            waitingOnYouTruncated: turn.truncated
          }
        : {})
    },
    description:
      'Summarize what is going on in the group’s trips and what waits on the viewer first: ideas to review, issues assigned to them, and polls to vote on, across every trip.',
    key: 'workspace:dashboard',
    title: `${groupName} · Home`
  };
}
