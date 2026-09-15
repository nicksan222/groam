import { api } from '@groam/backend/api';
import type { CreateTripAction } from '#src/actions/create-trip';
import type { BackendSession } from './backend-session';
import { authenticatedClient } from './convex-client';
import type { AuthenticatedAppUser } from './ensure-user';

export const createTrip: CreateTripAction<{
  backend: BackendSession;
  user: AuthenticatedAppUser;
}> = async ({ backend, user }, input) => {
  const client = await authenticatedClient(backend, user);
  const duration = input.durationDays
    ? {
        idealDays: input.durationDays,
        minimumDays: input.durationDays,
        totalDays: input.durationDays
      }
    : undefined;
  return await client.action(api.routes.trips.create.run, {
    input: {
      clientRequestId: `app-action:${crypto.randomUUID()}`,
      currency: 'USD',
      dateNotes: input.dateNotes,
      destination: { status: 'undecided' },
      duration,
      name: input.name
    }
  });
};
