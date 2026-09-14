import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import type { AddActivityAction } from '#src/actions/add-activity';
import type { BackendSession } from './backend-session';
import { authenticatedClient } from './convex-client';
import type { AuthenticatedAppUser } from './ensure-user';

export const addActivity: AddActivityAction<{
  backend: BackendSession;
  user: AuthenticatedAppUser;
}> = async ({ backend, user }, input) => {
  if (!input.tripId || !input.destinationId) {
    throw new Error('The backend addActivity action requires tripId and destinationId');
  }
  const client = await authenticatedClient(backend, user);
  await client.mutation(api.routes.trips.destinations.activities.add.run, {
    destinationId: input.destinationId as Id<'tripDestinations'>,
    input: {
      address: input.address,
      notes: input.notes,
      schedule: { day: 1, timeBlock: 'full_day' },
      title: input.title
    },
    tripId: input.tripId as Id<'trips'>
  });
};
