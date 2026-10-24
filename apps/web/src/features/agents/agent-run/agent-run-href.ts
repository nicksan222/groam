import { tripSectionConfig } from '@/features/trips/trip-sections';

export function agentHref(agentId: string) {
  return {
    params: { agentId },
    to: '/agents/$agentId' as const
  };
}

export function agentRunHref(agentId: string, runId: string) {
  return {
    params: { agentId, runId },
    to: '/agents/$agentId/$runId' as const
  };
}

/**
 * Where "back" leads from a run: the trip section of the item it worked on (an issue, an idea, a
 * chat) or the trip's Activity, and Home when the run belongs to no trip. A run's trip is always
 * the shared trip: issue and review runs store the issue's and the idea's source trip, and chat
 * runs the chat's trip, never an idea's working copy.
 */
export function agentRunBack(run: {
  discussionId: string | null;
  issueId: string | null;
  proposalId: string | null;
  tripId: string | null;
}) {
  if (!run.tripId) return { label: 'Home', target: { to: '/' as const } };
  if (run.discussionId && !run.issueId && !run.proposalId) {
    return {
      label: 'Chat',
      target: { params: { discussionId: run.discussionId }, to: '/chat/$discussionId' as const }
    };
  }
  const section = run.issueId
    ? ('issues' as const)
    : run.proposalId
      ? ('ideas' as const)
      : ('activity' as const);
  return {
    label: tripSectionConfig[section].label,
    target: {
      params: { section, tripId: run.tripId },
      to: '/trips/$tripId/$section' as const
    }
  };
}
