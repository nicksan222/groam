import { api } from '#convex-generated/api';
import type { setupTrip } from '#testing/trips';

export const changedTripDetails = {
  currency: 'EUR' as const,
  dateNotes: 'October school break',
  destination: { name: 'Lisbon', status: 'known' as const },
  duration: { totalDays: 6 },
  name: 'Lisbon proposal'
};

export type TripOwner = Awaited<ReturnType<typeof setupTrip>>['owner'];
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
