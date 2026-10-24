import { type AgentScreenContext, useSetAgentContext } from '@groam/ai/ui/context/agent-context';
import type { IssueDetailAgentContextInput } from '@/types/issues';

export type { IssueDetailAgentContextInput };

export function issueDetailScreenAgentContext(
  issue: IssueDetailAgentContextInput
): AgentScreenContext {
  return {
    capabilities: ['trip.status.read', 'trip.itinerary.read'],
    data: {
      doneWhen: issue.condition
        ? { kind: issue.condition.kind, label: issue.condition.label, met: issue.condition.met }
        : null,
      issueId: issue.id,
      status: issue.status,
      title: issue.title,
      tripName: issue.tripName
    },
    description:
      'Help turn this planning concern into a scoped issue, clarify acceptance criteria, and prepare work for a trip idea.',
    key: `issue:${issue.id}`,
    target: { kind: 'trip', section: 'issues', tripId: issue.tripId },
    title: `${issue.tripName} · ${issue.title}`
  };
}

export function useIssueDetailAgentContext(
  issue: IssueDetailAgentContextInput | null | undefined
): void {
  useSetAgentContext(issue ? issueDetailScreenAgentContext(issue) : null);
}
