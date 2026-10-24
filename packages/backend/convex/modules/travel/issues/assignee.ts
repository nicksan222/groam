import { assistantAgents } from '@groam/ai/agents';
import type { Infer } from 'convex/values';
import type { Doc } from '#convex-generated/dataModel';
import { issueEventMessage } from '#convex/modules/travel/issues/events';
import type { TripIssueValidators } from '#convex/modules/travel/issues/schema';

export type Assignee = Doc<'tripIssues'>['assignee'];

export const issueAgentAssignee = {
  agentId: assistantAgents.issue.id,
  kind: 'agent' as const,
  name: assistantAgents.issue.label
};

export function presentAssignee(
  assignee: NonNullable<Assignee>
): Infer<typeof TripIssueValidators.assignee> {
  return assignee.kind === 'agent' ? issueAgentAssignee : assignee;
}

/** Identifies who holds an issue. */
export function assigneeKey(assignee: Assignee | undefined | null): string | null {
  if (!assignee) return null;
  const presented = presentAssignee(assignee);
  return presented.kind === 'agent' ? `agent:${presented.agentId}` : `user:${presented.userId}`;
}

export function assignmentMessage(
  actorName: string,
  previous: Assignee | undefined,
  next: NonNullable<Assignee> | null
): string {
  return issueEventMessage(
    actorName,
    next === null
      ? { kind: 'unassigned', name: previous ? presentAssignee(previous).name : null }
      : { kind: 'assigned', name: presentAssignee(next).name }
  );
}
