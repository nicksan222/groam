import { api } from '@groam/backend/api';
import type { FunctionArgs, FunctionReturnType } from 'convex/server';
import type { BackendSession } from './backend-session';
import { authenticatedClient } from './convex-client';
import type { AuthenticatedAppUser } from './ensure-user';

export type CreateTripPlan = FunctionArgs<
  typeof api.routes.trips.seed.workspace.run
>['plans'][number];
export type CreatedTripIds = FunctionReturnType<typeof api.routes.trips.seed.workspace.run>;

export async function createTrips(
  backend: BackendSession,
  user: AuthenticatedAppUser,
  plans: readonly CreateTripPlan[]
): Promise<CreatedTripIds> {
  if (plans.length === 0) return [];
  const client = await authenticatedClient(backend, user);
  return await client.mutation(api.routes.trips.seed.workspace.run, { plans: [...plans] });
}
