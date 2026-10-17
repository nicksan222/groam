import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { useMutation, useQuery } from 'convex/react';
import { attempt, attemptValue } from '@/lib/errors';
import type { IssueConditionInput } from '@/types/issues';

export function useTripIssues(tripId: Id<'trips'>, enabled = true) {
  const issues = useQuery(api.routes.trips.issues.list.run, enabled ? { tripId } : 'skip');
  return { issues };
}

export function useTripIssue(issueId: Id<'tripIssues'>) {
  const issue = useQuery(api.routes.trips.issues.get.run, { issueId });
  const createVersionMutation = useMutation(api.routes.trips.versions.create.run);
  const commentMutation = useMutation(api.routes.trips.issues.comment.run);
  const dueMutation = useMutation(api.routes.trips.issues.due.run);
  const conditionMutation = useMutation(api.routes.trips.issues.condition.run);
  return {
    addComment: (content: string) =>
      attempt(() => commentMutation({ content, issueId }), 'Unable to add issue comment'),
    /** Sets, replaces, or (with neither field) clears the issue's "done when". */
    setCondition: (input: IssueConditionInput) =>
      attempt(
        () => conditionMutation({ ...input, issueId }),
        'Unable to update when this issue is done'
      ),
    setDueAt: (dueAt: number | null) =>
      attempt(() => dueMutation({ dueAt, issueId }), 'Unable to set a decide-by date'),
    implement: async () =>
      issue
        ? attemptValue(
            () => createVersionMutation({ issueId, tripId: issue.tripId }),
            'Unable to start an idea for this issue'
          )
        : null,
    issue
  };
}
