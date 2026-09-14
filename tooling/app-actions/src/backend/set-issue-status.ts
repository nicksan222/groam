import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import type { SetIssueStatusAction } from '#src/actions/set-issue-status';
import type { BackendSession } from './backend-session';
import { authenticatedClient } from './convex-client';
import type { AuthenticatedAppUser } from './ensure-user';

export const setIssueStatus: SetIssueStatusAction<{
  backend: BackendSession;
  user: AuthenticatedAppUser;
}> = async ({ backend, user }, input) => {
  if (!input.issueId) throw new Error('The backend setIssueStatus action requires issueId');
  const client = await authenticatedClient(backend, user);
  await client.mutation(api.routes.trips.issues.status.run, {
    issueId: input.issueId as Id<'tripIssues'>,
    status: input.status
  });
};
