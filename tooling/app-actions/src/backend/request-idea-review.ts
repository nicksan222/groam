import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import type { RequestIdeaReviewAction } from '#src/actions/request-idea-review';
import type { BackendSession } from './backend-session';
import { authenticatedClient } from './convex-client';
import type { AuthenticatedAppUser } from './ensure-user';

export const requestIdeaReview: RequestIdeaReviewAction<{
  backend: BackendSession;
  user: AuthenticatedAppUser;
}> = async ({ backend, user }, input) => {
  if (!input.proposalId) {
    throw new Error('The backend requestIdeaReview action requires proposalId');
  }
  const client = await authenticatedClient(backend, user);
  await client.action(api.routes.trips.versions.submit.run, {
    proposalId: input.proposalId as Id<'tripProposals'>
  });
};
