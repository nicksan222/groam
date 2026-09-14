import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import type { AddIssueCommentAction } from '#src/actions/add-issue-comment';
import type { BackendSession } from './backend-session';
import { authenticatedClient } from './convex-client';
import type { AuthenticatedAppUser } from './ensure-user';

export const addIssueComment: AddIssueCommentAction<{
  backend: BackendSession;
  user: AuthenticatedAppUser;
}> = async ({ backend, user }, input) => {
  if (!input.issueId) throw new Error('The backend addIssueComment action requires issueId');
  const client = await authenticatedClient(backend, user);
  await client.mutation(api.routes.trips.issues.comment.run, {
    content: input.content,
    issueId: input.issueId as Id<'tripIssues'>
  });
};
