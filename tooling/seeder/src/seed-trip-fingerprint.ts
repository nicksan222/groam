import type { SeedTripPlan } from './build-trip-plans';
import { seedActivityTitles } from './seed-activity-titles';

export type SeedTripFingerprint = {
  activityTitles: readonly string[];
  placeIds: readonly string[];
};

export function seedTripFingerprint(plan: SeedTripPlan): SeedTripFingerprint {
  const destination = plan.create.destination;
  const placeIds = [
    ...(destination.status === 'known' && 'placeId' in destination && destination.placeId
      ? [destination.placeId]
      : []),
    ...plan.additionalDestinations.flatMap(({ placeId }) => (placeId ? [placeId] : []))
  ];
  return {
    activityTitles: placeIds.length === 0 ? [] : seedActivityTitles,
    placeIds
  };
}

export function tripMatchesSeedFingerprint(
  trip: {
    destinations: Array<{ activities: Array<{ title: string }>; placeId: string }>;
  },
  fingerprint: SeedTripFingerprint
): boolean {
  if (fingerprint.placeIds.length === 0) return true;
  const destinations = new Map(
    trip.destinations.map((destination) => [destination.placeId, destination])
  );
  return fingerprint.placeIds.every((placeId) => {
    const destination = destinations.get(placeId);
    if (!destination) return false;
    const titles = new Set(destination.activities.map(({ title }) => title));
    return fingerprint.activityTitles.every((title) => titles.has(title));
  });
}
