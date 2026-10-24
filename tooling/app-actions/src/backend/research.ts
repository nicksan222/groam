import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import type { FunctionArgs } from 'convex/server';
import type { BackendSession } from './backend-session';
import { authenticatedClient } from './convex-client';
import type { AuthenticatedAppUser } from './ensure-user';

export type Actor = { backend: BackendSession; user: AuthenticatedAppUser };

export type ResearchLinkTarget =
  | { issueId: string; kind: 'issue' }
  | { kind: 'idea'; proposalId: string }
  | {
      kind: 'tripTarget';
      target: { id: string; type: 'activity' | 'destination' | 'stay' };
    };

export type CreateResearchInput = {
  brief?: string;
  clientRequestId: string;
  title: string;
  tripId: string;
};

export type TripResearchTargets = {
  destination: { id: string; name: string } | undefined;
  issues: Array<{ id: string; title: string }>;
};

export async function createResearch(
  { backend, user }: Actor,
  input: CreateResearchInput
): Promise<string> {
  const client = await authenticatedClient(backend, user);
  return await client.mutation(api.routes.discussions.research.create.run, {
    ...(input.brief === undefined ? {} : { brief: input.brief }),
    clientRequestId: input.clientRequestId,
    title: input.title,
    tripId: input.tripId as Id<'trips'>
  });
}

export async function linkResearch(
  { backend, user }: Actor,
  input: { discussionId: string; target: ResearchLinkTarget }
) {
  const client = await authenticatedClient(backend, user);
  await client.mutation(api.routes.discussions.research.links.link.run, {
    discussionId: input.discussionId as Id<'discussions'>,
    // Ids cross the action boundary as strings; the route validates the table.
    target: input.target as FunctionArgs<
      typeof api.routes.discussions.research.links.link.run
    >['target']
  });
}

/** Posts with a caller-chosen request id so reseeding with --no-reset stays idempotent. */
export async function postResearchMessage(
  { backend, user }: Actor,
  input: { clientRequestId: string; discussionId: string; text: string }
) {
  const client = await authenticatedClient(backend, user);
  await client.mutation(api.routes.discussions.messages.send.run, {
    clientRequestId: input.clientRequestId,
    discussionId: input.discussionId as Id<'discussions'>,
    text: input.text
  });
}

export async function findTripResearchTargets(
  { backend, user }: Actor,
  input: { tripId: string }
): Promise<TripResearchTargets> {
  const client = await authenticatedClient(backend, user);
  const tripId = input.tripId as Id<'trips'>;
  const [trip, issues] = await Promise.all([
    client.query(api.routes.trips.get.run, { tripId }),
    client.query(api.routes.trips.issues.list.run, { tripId })
  ]);
  const first = trip.destinations[0];
  return {
    destination: first ? { id: first.id, name: first.name } : undefined,
    issues: issues.map(({ id, title }) => ({ id, title }))
  };
}
