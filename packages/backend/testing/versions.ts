import { api } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import type { setupTrip } from '#testing/trips';
import { openTripDraft } from '#testing/trips';

export type Reviewer = Pick<Awaited<ReturnType<typeof setupTrip>>['owner'], 'client'>;

export const changedTripDetails = {
  currency: 'EUR' as const,
  dateNotes: 'October school break',
  destination: { name: 'Lisbon', status: 'known' as const },
  duration: { totalDays: 6 },
  name: 'Lisbon proposal'
};

export type TripOwner = Awaited<ReturnType<typeof setupTrip>>['owner'];
export type IdeaId = Id<'tripProposals'>;
export type TripId = Awaited<ReturnType<typeof setupTrip>>['tripId'];

export async function draftChangedVersion(owner: TripOwner, tripId: TripId) {
  const version = await owner.client.mutation(api.routes.trips.versions.create.run, { tripId });
  await owner.client.mutation(api.routes.trips.update.run, {
    input: changedTripDetails,
    tripId: version.workingTripId
  });
  return version;
}

export async function createTitledVersion(owner: TripOwner, tripId: TripId, title: string) {
  return await owner.client.mutation(api.routes.trips.versions.create.run, { title, tripId });
}

/** Submits an idea, has the reviewer approve it, and merges it onto the shared trip. */
export async function mergeIdea(owner: TripOwner, reviewer: Reviewer, proposalId: IdeaId) {
  await owner.client.action(api.routes.trips.versions.submit.run, { proposalId });
  await reviewer.client.mutation(api.routes.trips.versions.approval.run, {
    approved: true,
    proposalId
  });
  await owner.client.action(api.routes.trips.versions.merge.run, { proposalId });
}

/** Opens an idea, sets the working copy's details, and merges it. */
export async function applyIdea(
  owner: TripOwner,
  reviewer: Reviewer,
  tripId: TripId,
  input: Parameters<typeof owner.client.mutation<typeof api.routes.trips.update.run>>[1]['input']
) {
  const version = await openTripDraft(owner, tripId);
  await owner.client.mutation(api.routes.trips.update.run, {
    input,
    tripId: version.workingTripId
  });
  await mergeIdea(owner, reviewer, version.proposalId);
  return version;
}
