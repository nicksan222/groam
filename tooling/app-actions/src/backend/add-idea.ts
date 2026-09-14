import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import type { AddIdeaAction } from '#src/actions/add-idea';
import type { BackendSession } from './backend-session';
import { authenticatedClient } from './convex-client';
import type { AuthenticatedAppUser } from './ensure-user';

export const addIdea: AddIdeaAction<{
  backend: BackendSession;
  user: AuthenticatedAppUser;
}> = async ({ backend, user }, input) => {
  if (!input.tripId) throw new Error('The backend addIdea action requires tripId');
  const client = await authenticatedClient(backend, user);
  const result = await client.mutation(api.routes.trips.versions.create.run, {
    ideaName: input.name,
    tripId: input.tripId as Id<'trips'>
  });
  return result.proposalId;
};
