import type { AppUserProfile, BackendAppActions } from '@groam/app-actions/backend';
import type { SeedScenario } from './seed-scenario';
import {
  type SeedWorkspaceTripActions,
  type SeedWorkspaceTripsResult,
  seedWorkspaceTrips
} from './seed-workspace-trips';
import {
  type SeedWorkspaceUserActions,
  type SeedWorkspaceUsersResult,
  seedWorkspaceUsers
} from './seed-workspace-users';

export type SeedWorkspaceInput = {
  owner: AppUserProfile;
  reset: boolean;
  scenario: SeedScenario;
};

export type SeedWorkspaceActions = Pick<BackendAppActions, 'resetLocalDevelopmentData'> &
  SeedWorkspaceTripActions &
  SeedWorkspaceUserActions;

export type SeedWorkspaceResult = SeedWorkspaceTripsResult &
  SeedWorkspaceUsersResult & {
    reset?: Awaited<ReturnType<SeedWorkspaceActions['resetLocalDevelopmentData']>>;
  };

export async function seedWorkspace(
  app: SeedWorkspaceActions,
  input: SeedWorkspaceInput
): Promise<SeedWorkspaceResult> {
  const reset = input.reset ? await app.resetLocalDevelopmentData() : undefined;
  const users = await seedWorkspaceUsers(app, {
    concurrency: input.scenario.concurrency,
    createWorkspaceIfMissing: input.reset,
    owner: input.owner,
    userCount: input.scenario.userCount
  });
  const trips = await seedWorkspaceTrips(app, {
    concurrency: input.scenario.concurrency,
    owner: users.authenticatedOwner,
    tripCount: input.scenario.tripCount
  });

  return { ...users, ...trips, ...(reset ? { reset } : {}) };
}
