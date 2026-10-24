import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import type { ArchiveTripAction } from '#src/actions/archive-trip';
import type { BackendSession } from './backend-session';
import { authenticatedClient } from './convex-client';
import type { AuthenticatedAppUser } from './ensure-user';

export const archiveTrip: ArchiveTripAction<{
  backend: BackendSession;
  user: AuthenticatedAppUser;
}> = async ({ backend, user }, input) => {
  if (!input.tripId) throw new Error('The backend archiveTrip action requires tripId');
  const client = await authenticatedClient(backend, user);
  await client.mutation(api.routes.trips.archive.run, { tripId: input.tripId as Id<'trips'> });
};
