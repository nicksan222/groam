import type { Id } from '@groam/backend/data-model';
import { type AgentScreenContext, useSetAgentContext } from '@groam/ui/ai/context/agent-context';
import type { TripSection } from '@/features/trips/trip-sections';
import { useTripTravelers } from './use-trip-travelers';
import { useTripVersions } from './use-trip-versions';
import type { TripDetail } from './use-trips';

export function useTripAgentContext(trip: TripDetail | undefined, section: TripSection): void {
  const sourceTripId = trip?.proposal?.sourceTripId ?? trip?.id;
  const { proposals } = useTripVersions(
    sourceTripId ?? ('' as Id<'trips'>),
    section === 'ideas' && Boolean(sourceTripId)
  );
  const { travelers } = useTripTravelers(
    section === 'overview' && trip && !trip.proposal ? trip.id : undefined
  );
  useSetAgentContext(
    trip
      ? tripScreenAgentContext(trip, section, {
          ideas: (proposals ?? []).map((proposal) => ({
            id: proposal.id,
            ideaName: proposal.ideaName,
            status: proposal.status
          })),
          travelers: travelers.map((traveler) => ({
            name: traveler.name,
            status: traveler.status,
            userId: traveler.userId
          }))
        })
      : null
  );
}

export function tripScreenAgentContext(
  trip: TripDetail,
  section: TripSection,
  extras: {
    ideas?: Array<{ id: string; ideaName: string; status: string }>;
    travelers?: Array<{ name: string; status: string; userId: string }>;
  } = {}
): AgentScreenContext {
  const base = {
    archived: trip.archivedAt !== null,
    currency: trip.currency,
    groupMemberCount: trip.groupMemberCount,
    initialBudget: trip.initialBudget,
    role: trip.role,
    totalPlannedCost: trip.totalPlannedCost,
    tripName: trip.name
  };
  const sectionContext: Record<
    TripSection,
    Pick<AgentScreenContext, 'capabilities' | 'data' | 'description' | 'title'>
  > = {
    activity: {
      capabilities: ['trip.status.read', 'trip.itinerary.read'],
      data: {
        ...base,
        recentActivity: trip.activity.map((item) => ({
          actor: item.actorName,
          message: item.message,
          type: item.type
        }))
      },
      description: 'Use the visible audit trail to explain what recently changed in this trip.',
      title: `${trip.name} · Activity`
    },
    issues: {
      capabilities: ['trip.status.read', 'trip.itinerary.read'],
      data: base,
      description:
        'Help turn planning concerns into scoped trip issues, clarify acceptance criteria, and prepare work for a trip idea.',
      title: `${trip.name} · Issues`
    },
    itinerary: {
      capabilities: [
        'trip.status.read',
        'trip.itinerary.read',
        'web.search',
        ...(trip.permissions.canEdit
          ? ([
              'trip.activity.add',
              'trip.activity.remove',
              'trip.activity.update',
              'trip.cost.manage',
              'trip.destination.add',
              'trip.destination.remove',
              'trip.destination.schedule',
              'trip.details.update',
              'trip.itinerary.extend',
              'trip.stay.add',
              'trip.stay.remove',
              'trip.stay.update',
              'trip.transfer.remove',
              'trip.transfer.set'
            ] as const)
          : [])
      ],
      data: {
        ...base,
        destinations: trip.destinations.map((destination) => ({
          activities: destination.activities.map((activity) => ({
            day: activity.dayNumber,
            cost: activity.costAmount,
            costSplit: activity.costSplit,
            endDay: activity.endDayNumber,
            timeBlock: activity.timeBlock,
            title: activity.title
          })),
          endDay: destination.endDay,
          id: destination.id,
          stays: (destination.stays ?? []).map((stay) => ({
            checkInDay: stay.checkInDay,
            checkOutDay: stay.checkOutDay,
            cost: stay.costAmount,
            costSplit: stay.costSplit,
            title: stay.title
          })),
          name: destination.name,
          startDay: destination.startDay
        })),
        startDate: trip.startDate,
        totalDurationDays: trip.totalDurationDays
      },
      description:
        'Plan the visible route and activities. Only make itinerary changes after explicit confirmation.',
      title: `${trip.name} · Itinerary`
    },
    overview: {
      capabilities: [
        'trip.status.read',
        'trip.itinerary.read',
        'trip.packing.read',
        ...(trip.permissions.canEdit ? (['trip.packing.manage'] as const) : []),
        ...(trip.proposal || trip.archivedAt ? [] : (['trip.traveler.set'] as const))
      ],
      data: {
        ...base,
        destination: trip.destination.status === 'known' ? trip.destination.name : 'Undecided',
        destinationCount: trip.destinations.length,
        startDate: trip.startDate,
        totalDurationDays: trip.totalDurationDays,
        travelers: extras.travelers ?? []
      },
      description:
        'Read the day-by-day plan, exact times, travel, and packing. Make plan changes through an idea.',
      title: `${trip.name} · Overview`
    },
    ideas: {
      capabilities: [
        'trip.status.read',
        'trip.itinerary.read',
        'trip.version.approve',
        'trip.version.apply'
      ],
      data: {
        ...base,
        ideas: extras.ideas ?? []
      },
      description:
        'Help with the trip idea workflow: draft changes, review feedback, approvals, conflicts, and application status.',
      title: `${trip.name} · Ideas`
    }
  };
  return {
    ...sectionContext[section],
    key: `trip:${trip.id}:${section}`,
    target: { kind: 'trip', section, tripId: trip.id }
  };
}
