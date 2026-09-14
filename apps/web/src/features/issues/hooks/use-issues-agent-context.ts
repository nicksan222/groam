import { type AgentScreenContext, useSetAgentContext } from '@groam/ui/ai/context/agent-context';
import type { IssueDetailAgentContextInput } from '@/types/issues';
import type { WorkspaceIssue } from './use-workspace-issues';

export type { IssueDetailAgentContextInput };

export function issueListScreenAgentContext(
  activeGroup: string,
  issues: WorkspaceIssue[]
): AgentScreenContext {
  return {
    capabilities: [],
    data: {
      activeGroup,
      issues: issues.map((issue) => ({
        id: issue.id,
        status: issue.status,
        title: issue.title,
        tripName: issue.tripName
      }))
    },
    description:
      'Summarize open planning issues across the group and help decide what to settle next.',
    key: 'issues:list',
    title: 'Issues'
  };
}

export function issueDetailScreenAgentContext(
  issue: IssueDetailAgentContextInput
): AgentScreenContext {
  return {
    capabilities: ['trip.status.read', 'trip.itinerary.read'],
    data: {
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

export function useIssueListAgentContext(activeGroup: string, issues: WorkspaceIssue[]): void {
  useSetAgentContext(issueListScreenAgentContext(activeGroup, issues));
}

export function useIssueDetailAgentContext(
  issue: IssueDetailAgentContextInput | null | undefined
): void {
  useSetAgentContext(issue ? issueDetailScreenAgentContext(issue) : null);
}
