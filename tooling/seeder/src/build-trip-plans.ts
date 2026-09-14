import type { CreateTripPlan } from '@groam/app-actions/backend';
import { seedDestinationAt, seedDestinationCount } from './seed-destinations';

export type SeedTripPlan = {
  additionalDestinations: CreateTripPlan['additionalDestinations'];
  archived: boolean;
  create: CreateTripPlan['create'];
};

const periods = [
  'A long weekend in early spring',
  'Flexible dates in late April',
  'The first half of June',
  'Around the August bank holiday',
  'A week in September',
  'Late October, avoiding school holidays',
  'Between Christmas and New Year',
  'Any quiet week in February'
];

export function buildTripPlans(tripCount: number): SeedTripPlan[] {
  return Array.from({ length: tripCount }, (_, index) => {
    const destination = seedDestinationAt(index);
    const undecided = index % 5 === 4;
    const minimumDurationDays = 3 + (index % 5);
    const idealDurationDays = minimumDurationDays + 2 + (index % 4);
    const extraStopCount = undecided ? 0 : index % 4 === 0 ? 2 : index % 3 === 0 ? 1 : 0;
    const totalDurationDays = Math.max(idealDurationDays, 2 + extraStopCount * 2);
    const sequence = String(index + 1).padStart(2, '0');
    const name = undecided
      ? `Next adventure shortlist ${sequence}`
      : `${destination.name.split(',')[0]} ${index % 3 === 0 ? 'long weekend' : 'escape'} ${sequence}`;

    const create: SeedTripPlan['create'] = {
      clientRequestId: `seed:trip:${String(index + 1).padStart(4, '0')}`,
      budget: { amount: 600 + (index % 8) * 350 },
      currency: destination.currency,
      dateNotes: periods[index % periods.length],
      destination: undecided
        ? { status: 'undecided' }
        : {
            countryCode: destination.countryCode,
            coordinates: {
              latitude: destination.latitude,
              longitude: destination.longitude
            },
            name: destination.name,
            placeId: destination.placeId,
            status: 'known'
          },
      duration: {
        idealDays: idealDurationDays,
        minimumDays: minimumDurationDays,
        totalDays: totalDurationDays
      },
      name
    };

    const usedPlaceIds = new Set(undecided ? [] : [destination.placeId]);
    const additionalDestinations: SeedTripPlan['additionalDestinations'] = [];
    for (
      let offset = 1;
      additionalDestinations.length < extraStopCount && offset < seedDestinationCount;
      offset += 1
    ) {
      const stop = seedDestinationAt(index + offset);
      if (usedPlaceIds.has(stop.placeId)) continue;
      usedPlaceIds.add(stop.placeId);
      const stopIndex = additionalDestinations.length;
      additionalDestinations.push({
        countryCode: stop.countryCode,
        coordinates: { latitude: stop.latitude, longitude: stop.longitude },
        dayNotes: `Explore ${stop.name.split(',')[0]}`,
        name: stop.name,
        placeId: stop.placeId,
        schedule: { endDay: stopIndex * 2 + 4, startDay: stopIndex * 2 + 3 },
        status: 'known'
      });
    }

    return {
      additionalDestinations,
      archived: tripCount >= 4 && index > 0 && (index % 9 === 0 || index === tripCount - 1),
      create
    };
  });
}
