import { type AgentScreenContext, useSetAgentContext } from '@groam/ai/ui/context/agent-context';
import { isResolved } from '@groam/backend/convex/modules/travel/issues/status';
import type { Id } from '@groam/backend/data-model';
import { type TripSection, tripSectionTitle } from '@/features/trips/trip-sections';
import type { TripAgentView } from '@/types/trips';
import { useTripIssues } from './use-trip-issues';
import { useTripTravelers } from './use-trip-travelers';
import { useTripVersions } from './use-trip-versions';
import type { TripDetail } from './use-trips';

/** Which live lists a screen's assistant context carries, so the others are not subscribed. */
function agentContextNeeds(trip: TripDetail | undefined, view: TripAgentView) {
  const shared = trip !== undefined && !trip.proposal;
  const onBoard = shared && view === 'board';
  return {
    ideas: view === 'idea-compare' || onBoard || (shared && view === 'ideas'),
    issues: onBoard || (shared && view === 'issues'),
    travelers: onBoard || (shared && view === 'overview')
  };
}

export function useTripAgentContext(trip: TripDetail | undefined, view: TripAgentView): void {
  const section = view === 'idea-compare' ? undefined : view;
  const sourceTripId = trip?.proposal?.sourceTripId ?? trip?.id;
  const needs = agentContextNeeds(trip, view);
  const { proposals } = useTripVersions(
    sourceTripId ?? ('' as Id<'trips'>),
    needs.ideas && Boolean(sourceTripId)
  );
  const { issues } = useTripIssues(sourceTripId ?? ('' as Id<'trips'>), needs.issues);
  const { travelers } = useTripTravelers(needs.travelers && trip ? trip.id : undefined);
  const ideas = (proposals ?? []).map((proposal) => ({
    id: proposal.id,
    ideaName: proposal.ideaName,
    status: proposal.status
  }));
  useSetAgentContext(
    !trip
      ? null
      : section === undefined
        ? ideaCompareAgentContext(trip, ideas)
        : tripScreenAgentContext(trip, section, {
            ideas,
            openIssues: (issues ?? [])
              .filter((issue) => !isResolved(issue.status))
              .map((issue) => ({ id: issue.id, title: issue.title })),
            travelers: travelers.map((traveler) => ({
              name: traveler.name,
              status: traveler.status,
              userId: traveler.userId
            }))
          })
  );
}

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

export function tripScreenAgentContext(
  trip: TripDetail,
  section: TripSection,
  extras: {
    ideas?: Array<{ id: string; ideaName: string; status: string }>;
    openIssues?: Array<{ id: string; title: string }>;
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
  const overviewData = {
    ...base,
    destination: trip.destination.status === 'known' ? trip.destination.name : 'Undecided',
    destinationCount: trip.destinations.length,
    startDate: trip.startDate,
    totalDurationDays: trip.totalDurationDays,
    travelers: extras.travelers ?? []
  };
  const sectionContext: Record<
    TripSection,
    Pick<AgentScreenContext, 'capabilities' | 'data' | 'description'>
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
      description: 'Use the visible audit trail to explain what recently changed in this trip.'
    },
    itinerary: {
      capabilities: [
        'trip.status.read',
        'trip.itinerary.read',
        ...(trip.proposal ? [] : (['trip.packing.read'] as const)),
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
        'Plan the visible route and activities. Only make itinerary changes after explicit confirmation.'
    },
    board: {
      capabilities: [
        'trip.status.read',
        'trip.itinerary.read',
        'trip.packing.read',
        ...(trip.archivedAt ? [] : (['trip.traveler.set'] as const)),
        'trip.version.approve',
        'trip.version.apply'
      ],
      data: {
        ...overviewData,
        ideas: extras.ideas ?? [],
        openIssues: extras.openIssues ?? []
      },
      description:
        'The trip board: the agreed plan, ideas, and what is still open (issues and gaps). Help the group settle open items; plan changes go through an idea.'
    },
    ideas: {
      capabilities: [
        'trip.status.read',
        'trip.itinerary.read',
        'trip.version.approve',
        'trip.version.apply'
      ],
      data: { ...base, ideas: extras.ideas ?? [] },
      description:
        'Help with the trip idea workflow: draft changes, review feedback, approvals, conflicts, and application status.'
    },
    issues: {
      capabilities: ['trip.status.read', 'trip.itinerary.read'],
      data: { ...base, openIssues: extras.openIssues ?? [] },
      description:
        'Help turn planning concerns into scoped trip issues, clarify acceptance criteria, and prepare work for a trip idea.'
    },
    overview: {
      capabilities: [
        'trip.status.read',
        'trip.itinerary.read',
        'trip.packing.read',
        ...(trip.permissions.canEdit ? (['trip.packing.manage'] as const) : [])
      ],
      data: overviewData,
      description: trip.proposal
        ? 'Read the day-by-day plan, exact times, travel, and packing. Make plan changes through an idea.'
        : 'The overview of the agreed plan: at a glance, route, day-by-day itinerary, and packing. Read it to answer questions; plan changes go through an idea.'
    }
  };
  return {
    ...sectionContext[section],
    title: `${trip.name} · ${tripSectionTitle(section)}`,
    key: `trip:${trip.id}:${section}`,
    target: { kind: 'trip', section: assistantSection(section), tripId: trip.id }
  };
}

/** The assistant backend names the board's section "overview"; it has no "board" literal yet. */
function assistantSection(section: TripSection) {
  return section === 'board' ? 'overview' : section;
}
