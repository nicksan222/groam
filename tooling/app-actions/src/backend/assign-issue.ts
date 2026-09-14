import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import type { AssignIssueAction } from '#src/actions/assign-issue';
import type { BackendSession } from './backend-session';
import { authenticatedClient } from './convex-client';
import type { AuthenticatedAppUser } from './ensure-user';

export const assignIssue: AssignIssueAction<{
  backend: BackendSession;
  user: AuthenticatedAppUser;
}> = async ({ backend, user }, input) => {
  if (!input.issueId) throw new Error('The backend assignIssue action requires issueId');
  const client = await authenticatedClient(backend, user);
  const assignee =
    input.assignee?.kind === 'agent'
      ? { agentId: 'issue' as const, kind: 'agent' as const, name: 'Issue agent' }
      : input.assignee;
  await client.mutation(api.routes.trips.issues.assign.run, {
    assignee,
    issueId: input.issueId as Id<'tripIssues'>
  });
};
