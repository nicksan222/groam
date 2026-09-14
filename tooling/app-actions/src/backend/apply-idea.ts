import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import type { ApplyIdeaAction } from '#src/actions/apply-idea';
import type { BackendSession } from './backend-session';
import { authenticatedClient } from './convex-client';
import type { AuthenticatedAppUser } from './ensure-user';

export const applyIdea: ApplyIdeaAction<{
  backend: BackendSession;
  user: AuthenticatedAppUser;
}> = async ({ backend, user }, input) => {
  if (!input.proposalId) throw new Error('The backend applyIdea action requires proposalId');
  const client = await authenticatedClient(backend, user);
  return await client.action(api.routes.trips.versions.merge.run, {
    proposalId: input.proposalId as Id<'tripProposals'>
  });
};
