import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import type { BackendSession } from './backend-session';
import { authenticatedClient } from './convex-client';
import type { AuthenticatedAppUser } from './ensure-user';

/** Looks up an idea on a trip by the name it was started with, as the given user sees it. */
export async function findIdea(
  { backend, user }: { backend: BackendSession; user: AuthenticatedAppUser },
  input: { name: string; tripId: string }
): Promise<{ proposalId: string; workingTripId: string }> {
  const client = await authenticatedClient(backend, user);
  const ideas = await client.query(api.routes.trips.versions.list.run, {
    tripId: input.tripId as Id<'trips'>
  });
  const idea = ideas.find(({ ideaName, title }) => ideaName === input.name || title === input.name);
  if (!idea) throw new Error(`No idea named "${input.name}" on the trip`);
  return { proposalId: idea.id, workingTripId: idea.workingTripId };
}
