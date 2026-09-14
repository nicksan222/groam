import type { AuthenticatedAppUser, BackendAppActions } from '@groam/app-actions/backend';
import { buildWorkspaceSeedPlans } from './build-workspace-seed-plans';
import { mapWithConcurrency } from './map-with-concurrency';

const TRIP_BATCH_SIZE = 8;

export type SeedWorkspaceTripsInput = {
  concurrency: number;
  owner: AuthenticatedAppUser;
  tripCount: number;
};

export type SeedWorkspaceTripActions = Pick<BackendAppActions, 'createTrips'>;

export type SeedWorkspaceTripsResult = {
  archivedCount: number;
  openProposalCount: number;
  tripCount: number;
};

function batches<Item>(items: readonly Item[], size: number): Item[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, index * size + size)
  );
}

export async function seedWorkspaceTrips(
  app: SeedWorkspaceTripActions,
  input: SeedWorkspaceTripsInput
): Promise<SeedWorkspaceTripsResult> {
  const plans = buildWorkspaceSeedPlans(input.tripCount);
  await mapWithConcurrency(batches(plans, TRIP_BATCH_SIZE), input.concurrency, (batch) =>
    app.createTrips(input.owner, batch)
  );

  return {
    archivedCount: plans.filter(({ archived }) => archived).length,
    openProposalCount: plans.filter(({ proposal }) => proposal !== undefined).length,
    tripCount: plans.length
  };
}
