import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import type { BackendSession } from './backend-session';
import { assertLocalDevelopmentUrl } from './backend-session';
import { authenticatedClient } from './convex-client';
import type { AuthenticatedAppUser } from './ensure-user';

/** Populate illustrative local scenarios through the authorized development boundary. */
export async function enrichTrip(
  backend: BackendSession,
  user: AuthenticatedAppUser,
  input: { tripId: string; scenarioIndex: number }
) {
  assertLocalDevelopmentUrl(backend.config.convexUrl, 'Seed Convex URL');
  const client = await authenticatedClient(backend, user);
  return client.mutation(api.routes.trips.seed.enrich.run, {
    tripId: input.tripId as Id<'trips'>,
    scenarioIndex: input.scenarioIndex
  });
}
