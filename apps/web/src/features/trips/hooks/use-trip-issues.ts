import { assistantAgents } from '@groam/ai-contracts/agents/registry';
import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { toast } from '@groam/ui/components/toast';
import { useMutation, useQuery } from 'convex/react';
import { useCallback } from 'react';
import { errorMessage } from '@/lib/errors';

export function useTripIssues(tripId: Id<'trips'>) {
  const issues = useQuery(api.routes.trips.issues.list.run, { tripId });
  const createMutation = useMutation(api.routes.trips.issues.create.run);
  const createIssue = useCallback(
    async (title: string, body: string) => {
      try {
        return await createMutation({ body, title, tripId });
      } catch (error: unknown) {
        toast.error(errorMessage(error, 'Unable to create trip issue'));
        return null;
      }
    },
    [createMutation, tripId]
  );
  return { createIssue, issues };
}

export function useTripIssue(issueId: Id<'tripIssues'>) {
  const issue = useQuery(api.routes.trips.issues.get.run, { issueId });
  const createVersionMutation = useMutation(api.routes.trips.versions.create.run);
  const commentMutation = useMutation(api.routes.trips.issues.comment.run);
  const statusMutation = useMutation(api.routes.trips.issues.status.run);
  const dueMutation = useMutation(api.routes.trips.issues.due.run);
  const assignMutation = useMutation(api.routes.trips.issues.assign.run);
  const run = useCallback(async (action: () => Promise<unknown>, fallback: string) => {
    try {
      await action();
      return true;
    } catch (error: unknown) {
      toast.error(errorMessage(error, fallback));
      return false;
    }
  }, []);
  return {
    addComment: (content: string) =>
      run(() => commentMutation({ content, issueId }), 'Unable to add issue comment'),
    assignIssueAgent: () =>
      run(
        () =>
          assignMutation({
            assignee: {
              agentId: assistantAgents.issue.id,
              kind: 'agent',
              name: assistantAgents.issue.label
            },
            issueId
          }),
        'Unable to assign the Issue agent'
      ),
    assignUser: (userId: string, name: string) =>
      run(
        () => assignMutation({ assignee: { kind: 'user', name, userId }, issueId }),
        'Unable to assign this person'
      ),
    setDueAt: (dueAt: number | null) =>
      run(() => dueMutation({ dueAt, issueId }), 'Unable to set a decide-by date'),
    unassign: () =>
      run(() => assignMutation({ assignee: null, issueId }), 'Unable to update assignees'),
    implement: async () => {
      if (!issue) return null;
      try {
        return await createVersionMutation({ issueId, tripId: issue.tripId });
      } catch (error: unknown) {
        toast.error(errorMessage(error, 'Unable to start an idea for this issue'));
        return null;
      }
    },
    issue,
    setStatus: (status: 'closed' | 'open') =>
      run(() => statusMutation({ issueId, status }), 'Unable to update issue status')
  };
}
