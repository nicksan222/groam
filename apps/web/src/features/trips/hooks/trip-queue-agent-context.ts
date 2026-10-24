import type { TripScreenAgentPart } from '@/types/trips';
import type { TripDetail } from './use-trips';

/** What the assistant sees on a trip's Ideas tab: the ideas, and the means to review them. */
export function ideasAgentContext(
  base: Record<string, unknown>,
  ideas: Array<{ id: string; ideaName: string; status: string }>
): TripScreenAgentPart {
  return {
    capabilities: [
      'trip.status.read',
      'trip.itinerary.read',
      'trip.version.approve',
      'trip.version.apply'
    ],
    data: { ...base, ideas },
    description:
      'The changes people have proposed to the trip. Help read an idea, compare it with the agreed plan, or move it toward approval.'
  };
}

/** What the assistant sees on a trip's Issues tab: the open issues. */
export function issuesAgentContext(
  base: Record<string, unknown>,
  openIssues: Array<{ id: string; title: string }>
): TripScreenAgentPart {
  return {
    capabilities: ['trip.status.read', 'trip.itinerary.read'],
    data: { ...base, openIssues },
    description:
      'The open questions and to-dos the group has to settle. Help word an issue, decide what to do next, or start an idea that answers one.'
  };
}

/** What the assistant sees on a trip's Polls tab: the polls, and whether it may start one. */
export function pollsAgentContext(
  trip: TripDetail,
  base: Record<string, unknown>,
  polls: Array<{
    eligibleCount: number;
    id: string;
    question: string;
    status: string;
    votedCount: number;
  }>
): TripScreenAgentPart {
  return {
    capabilities: [
      'trip.status.read',
      'trip.itinerary.read',
      ...(trip.archivedAt === null ? (['poll.create'] as const) : [])
    ],
    data: { ...base, polls },
    description:
      'The quick votes the group is taking. Help word a poll, read the results, or suggest one for an open choice.'
  };
}
