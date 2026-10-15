import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import type { AddIdeaAction, AddIdeaInput } from '#src/actions/add-idea';
import type { BackendSession } from './backend-session';
import { authenticatedClient } from './convex-client';
import type { AuthenticatedAppUser } from './ensure-user';

export type BackendActor = {
  backend: BackendSession;
  user: AuthenticatedAppUser;
};

export type StartedIdea = {
  proposalId: string;
  /** The idea's working copy; trip edits made inside the idea target this trip. */
  workingTripId: string;
};

export async function startIdea(
  { backend, user }: BackendActor,
  input: AddIdeaInput
): Promise<StartedIdea> {
  if (!input.tripId) throw new Error('The backend addIdea action requires tripId');
  const client = await authenticatedClient(backend, user);
  const result = await client.mutation(api.routes.trips.versions.create.run, {
    ideaName: input.name,
    tripId: input.tripId as Id<'trips'>
  });
  return { proposalId: result.proposalId, workingTripId: result.workingTripId };
}

export const addIdea: AddIdeaAction<BackendActor> = async (actor, input) =>
  (await startIdea(actor, input)).proposalId;
