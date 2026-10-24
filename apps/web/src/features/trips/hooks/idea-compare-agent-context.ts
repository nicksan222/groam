import type { AgentScreenContext } from '@groam/ai/ui/context/agent-context';
import type { TripDetail } from './use-trips';

export function ideaCompareAgentContext(
  trip: TripDetail,
  ideas: Array<{ id: string; ideaName: string; status: string }>
): AgentScreenContext {
  return {
    capabilities: [
      'trip.status.read',
      'trip.itinerary.read',
      'trip.version.approve',
      'trip.version.apply'
    ],
    data: {
      archived: trip.archivedAt !== null,
      currency: trip.currency,
      groupMemberCount: trip.groupMemberCount,
      ideas,
      initialBudget: trip.initialBudget,
      role: trip.role,
      totalPlannedCost: trip.totalPlannedCost,
      tripName: trip.name
    },
    description:
      'Help with the trip idea workflow: draft changes, review feedback, approvals, conflicts, and application status.',
    key: `trip:${trip.id}:ideas`,
    target: { kind: 'trip', section: 'ideas', tripId: trip.id },
    title: `${trip.name} · Ideas`
  };
}
