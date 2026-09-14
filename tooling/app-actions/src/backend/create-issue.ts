import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import type { CreateIssueAction } from '#src/actions/create-issue';
import type { BackendSession } from './backend-session';
import { authenticatedClient } from './convex-client';
import type { AuthenticatedAppUser } from './ensure-user';

export const createIssue: CreateIssueAction<{
  backend: BackendSession;
  user: AuthenticatedAppUser;
}> = async ({ backend, user }, input) => {
  if (!input.tripId) throw new Error('The backend createIssue action requires tripId');
  const client = await authenticatedClient(backend, user);
  return await client.mutation(api.routes.trips.issues.create.run, {
    body: input.body,
    title: input.title,
    tripId: input.tripId as Id<'trips'>
  });
};
