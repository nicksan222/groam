import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import type { RestoreTripAction } from '#src/actions/restore-trip';
import type { BackendSession } from './backend-session';
import { authenticatedClient } from './convex-client';
import type { AuthenticatedAppUser } from './ensure-user';

export const restoreTrip: RestoreTripAction<{
  backend: BackendSession;
  user: AuthenticatedAppUser;
}> = async ({ backend, user }, input) => {
  if (!input.tripId) throw new Error('The backend restoreTrip action requires tripId');
  const client = await authenticatedClient(backend, user);
  await client.mutation(api.routes.trips.restore.run, { tripId: input.tripId as Id<'trips'> });
};
