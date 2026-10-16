import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { useMutation } from 'convex/react';
import { useCallback } from 'react';
import { attempt } from '@/lib/errors';
import type { IssueAssigneeInput, IssueStatus } from '@/types/issues';

/**
 * Issue writes that take the issue id per call, so one hook serves a page, a sheet, or a board of
 * many cards. Both resolve to `true` on success and toast on failure.
 */
export function useIssueMutations() {
  const statusMutation = useMutation(api.routes.trips.issues.status.run);
  const assignMutation = useMutation(api.routes.trips.issues.assign.run);
  const setStatus = useCallback(
    (issueId: Id<'tripIssues'>, status: IssueStatus) =>
      attempt(() => statusMutation({ issueId, status }), 'Unable to update issue status'),
    [statusMutation]
  );
  const assign = useCallback(
    (issueId: Id<'tripIssues'>, assignee: IssueAssigneeInput | null) =>
      attempt(
        () => assignMutation({ assignee, issueId }),
        assignee ? `Unable to assign ${assignee.name}` : 'Unable to update assignees'
      ),
    [assignMutation]
  );
  return { assign, setStatus };
}
