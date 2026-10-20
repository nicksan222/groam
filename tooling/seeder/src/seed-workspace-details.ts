import type { AuthenticatedAppUser, BackendAppActions } from '@groam/app-actions/backend';
import { mapWithConcurrency } from './map-with-concurrency';

export type SeedWorkspaceDetailActions = Pick<BackendAppActions, 'enrichTrip'>;
export type SeedWorkspaceDetailsResult = {
  ideaCount: number;
  issueCount: number;
  packingItemCount: number;
  researchCount: number;
  stayCount: number;
};

/** Each trip's connected fixture graph is one idempotent local transaction. */
export async function seedWorkspaceDetails(
  app: SeedWorkspaceDetailActions,
  input: { owner: AuthenticatedAppUser; tripIds: readonly string[] }
): Promise<SeedWorkspaceDetailsResult> {
  // Graph writes share the organization and actor's rate buckets, so run them in order.
  const results = await mapWithConcurrency(input.tripIds, 1, (tripId, scenarioIndex) =>
    app.enrichTrip(input.owner, { tripId, scenarioIndex })
  );
  return results.reduce(
    (total, result) => ({
      ideaCount: total.ideaCount + result.ideas,
      issueCount: total.issueCount + result.issues,
      packingItemCount: total.packingItemCount + result.packingItems,
      researchCount: total.researchCount + result.researches,
      stayCount: total.stayCount + result.stays
    }),
    { ideaCount: 0, issueCount: 0, packingItemCount: 0, researchCount: 0, stayCount: 0 }
  );
}
