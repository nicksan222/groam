import { type AgentScreenContext, useSetAgentContext } from '@groam/ai/ui/context/agent-context';
import { isResolved } from '@groam/backend/convex/modules/travel/issues/status';
import type { Id } from '@groam/backend/data-model';
import { ideaViewTitles } from '@/features/ideas/idea-clone/idea-sections';
import { useTripResearches } from '@/features/research/hooks/use-trip-researches';
import { isTripSection, tripSectionTitle } from '@/features/trips/trip-sections';
import type { IdeaPlanningSection } from '@/types/ideas';
import type { Poll } from '@/types/polls';
import type { TripAgentView, TripTabSection } from '@/types/trips';
import { ideaCompareAgentContext } from './idea-compare-agent-context';
import { assistantSection } from './trip-assistant-section';
import { packingAgentContext } from './trip-packing-agent-context';
import {
  ideasAgentContext,
  issuesAgentContext,
  pollsAgentContext
} from './trip-queue-agent-context';
import { useTripIssues } from './use-trip-issues';
import { useTripPacking } from './use-trip-packing';
import { useTripTravelers } from './use-trip-travelers';
import { useTripVersions } from './use-trip-versions';
import type { TripDetail } from './use-trips';

/** Which live lists a screen's assistant context carries, so the others are not subscribed. */
function agentContextNeeds(trip: TripDetail | undefined, view: TripAgentView) {
  const shared = trip !== undefined && !trip.proposal;
  const onPlan = shared && view === 'plan';
  return {
    ideas: view === 'idea-compare' || onPlan || (shared && view === 'ideas'),
    packing: view === 'packing',
    issues: onPlan || (shared && view === 'issues'),
    research: shared && view === 'research',
    travelers:
      onPlan || (shared && (view === 'calendar' || view === 'people')) || view === 'packing'
  };
}

/** The trip id a live list subscribes with, or undefined to skip it. */
function liveTripId(trip: TripDetail | undefined, needed: boolean): Id<'trips'> | undefined {
  return needed && trip ? trip.id : undefined;
}

/**
 * `livePolls` are the trip's polls when the page already holds them (the Polls section opens them
 * once and shares them), so the assistant does not page in a second copy.
 */
export function useTripAgentContext(
  trip: TripDetail | undefined,
  view: TripAgentView,
  livePolls: Poll[] = []
): void {
  const section = view === 'idea-compare' ? undefined : view;
  const sourceTripId = trip?.proposal?.sourceTripId ?? trip?.id;
  const needs = agentContextNeeds(trip, view);
  const { proposals } = useTripVersions(
    sourceTripId ?? ('' as Id<'trips'>),
    needs.ideas && Boolean(sourceTripId)
  );
  const { issues } = useTripIssues(sourceTripId ?? ('' as Id<'trips'>), needs.issues);
  const packingList = useTripPacking(liveTripId(trip, needs.packing));
  const { researches } = useTripResearches(liveTripId(trip, needs.research));
  const { travelers } = useTripTravelers(liveTripId(trip, needs.travelers));
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
            packing: packingList.items.map((item) => ({
              bringers: item.bringers.map((bringer) => ({
                count: bringer.count,
                name: bringer.name,
                userId: bringer.userId
              })),
              brought: item.brought,
              id: item.id,
              label: item.label,
              quantity: item.quantity
            })),
            polls: livePolls.map((poll) => ({
              eligibleCount: poll.eligibleCount,
              id: poll.id,
              question: poll.question,
              status: poll.status,
              votedCount: poll.votedCount
            })),
            researches: researches.map((research) => ({
              brief: research.brief,
              id: research.id,
              linkCount: research.linkCount,
              title: research.title
            })),
            travelers: travelers.map((traveler) => ({
              name: traveler.name,
              status: traveler.status,
              userId: traveler.userId
            }))
          })
  );
}

/** What the assistant may do to an itinerary the viewer can edit. */
const itineraryEditCapabilities = [
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
] as const;

function screenTitle(section: IdeaPlanningSection | TripTabSection) {
  return isTripSection(section) ? tripSectionTitle(section) : ideaViewTitles[section];
}

export function tripScreenAgentContext(
  trip: TripDetail,
  section: IdeaPlanningSection | TripTabSection,
  extras: {
    ideas?: Array<{ id: string; ideaName: string; status: string }>;
    openIssues?: Array<{ id: string; title: string }>;
    packing?: Array<{
      bringers: Array<{ count: number; name: string; userId: string }>;
      brought: number;
      id: string;
      label: string;
      quantity: number;
    }>;
    polls?: Array<{
      eligibleCount: number;
      id: string;
      question: string;
      status: string;
      votedCount: number;
    }>;
    researches?: Array<{ brief: null | string; id: string; linkCount: number; title: string }>;
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
  const issuesContext = issuesAgentContext(base, extras.openIssues ?? []);
  const sectionContext: Record<
    IdeaPlanningSection | TripTabSection,
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
        ...(trip.permissions.canEdit ? itineraryEditCapabilities : [])
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
    plan: {
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
        'The agreed plan day by day, with its route, the budget, and what still waits on the group (ideas and issues). Read it to answer questions; plan changes go through an idea.'
    },
    ideas: ideasAgentContext(base, extras.ideas ?? []),
    issues: issuesContext,
    polls: pollsAgentContext(trip, base, extras.polls ?? []),
    research: {
      capabilities: ['trip.status.read', 'research.list', 'research.read', 'research.create'],
      data: { ...base, researches: extras.researches ?? [] },
      description:
        'The trip’s researches: subjects the group is collecting links and notes about. Help start one, find one, or summarize what a research found.'
    },
    overview: {
      capabilities: ['trip.status.read', 'trip.itinerary.read'],
      data: overviewData,
      description:
        'Read the idea’s day-by-day plan, exact times, and travel. Make plan changes through the idea.'
    },
    calendar: {
      capabilities: ['trip.status.read', 'trip.itinerary.read'],
      data: overviewData,
      description:
        'The whole plan on a calendar: every stop, stay, activity, and travel leg by day and time. Read it to answer questions about when things happen; plan changes go through an idea.'
    },
    map: {
      capabilities: ['trip.status.read', 'trip.itinerary.read'],
      data: overviewData,
      description:
        'The route on a street map: every stop numbered in order and colored by the day it starts, joined by its travel legs, with a chip to narrow it to one day. Read it to answer where things are; plan changes go through an idea.'
    },
    people: {
      capabilities: [
        'trip.status.read',
        ...(trip.archivedAt ? [] : (['trip.traveler.set'] as const))
      ],
      data: { ...base, travelers: extras.travelers ?? [] },
      description:
        'Who is on this trip: each person’s RSVP (going, invited without a seat, maybe, or not going). Help read the roster or change an RSVP when asked.'
    },
    packing: packingAgentContext(trip, base, extras.packing ?? [], extras.travelers ?? [])
  };
  return {
    ...sectionContext[section],
    title: `${trip.name} · ${screenTitle(section)}`,
    key: `trip:${trip.id}:${section}`,
    target: { kind: 'trip', section: assistantSection(section), tripId: trip.id }
  };
}
