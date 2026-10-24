import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import type { ApproveIdeaAction } from '#src/actions/approve-idea';
import type { BackendSession } from './backend-session';
import { authenticatedClient } from './convex-client';
import type { AuthenticatedAppUser } from './ensure-user';

export const approveIdea: ApproveIdeaAction<{
  backend: BackendSession;
  user: AuthenticatedAppUser;
}> = async ({ backend, user }, input) => {
  if (!input.proposalId) throw new Error('The backend approveIdea action requires proposalId');
  const client = await authenticatedClient(backend, user);
  await client.mutation(api.routes.trips.versions.approval.run, {
    approved: input.approved ?? true,
    proposalId: input.proposalId as Id<'tripProposals'>
  });
};
