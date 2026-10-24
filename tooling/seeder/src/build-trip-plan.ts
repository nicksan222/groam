import type { CreateTripPlan } from '@groam/app-actions/backend';
import type { SeedTrip } from './seed-types';

export function buildTripPlan(trip: SeedTrip): CreateTripPlan {
  const [home, ...rest] = trip.stops;
  if (!home) throw new Error(`Seed trip ${trip.key} needs a destination`);
  return {
    activities: trip.activities.map(({ block, day, notes, stop, time, title }) => ({
      destinationIndex: stop,
      input: {
        schedule: {
          day,
          timeBlock: block,
          ...(time ? { startTime: time[0], endTime: time[1] } : {})
        },
        title,
        ...(notes ? { notes } : {})
      }
    })),
    additionalDestinations: rest.map((stop) => ({
      coordinates: { latitude: stop.latitude, longitude: stop.longitude },
      countryCode: stop.countryCode,
      name: stop.name,
      placeId: stop.placeId,
      schedule: { endDay: stop.lastDay, startDay: stop.firstDay },
      status: 'known' as const,
      ...(stop.notes ? { dayNotes: stop.notes } : {})
    })),
    archived: trip.archived ?? false,
    create: {
      budget: { amount: trip.budget },
      clientRequestId: `seed:v3:trip:${trip.key}`,
      currency: trip.currency,
      dateNotes: trip.dateNotes,
      destination: {
        coordinates: { latitude: home.latitude, longitude: home.longitude },
        countryCode: home.countryCode,
        name: home.name,
        placeId: home.placeId,
        status: 'known'
      },
      duration: {
        idealDays: trip.idealDays,
        minimumDays: trip.minimumDays,
        totalDays: trip.totalDays
      },
      name: trip.name,
      ...(trip.startDate ? { startDate: trip.startDate } : {})
    },
    primary: {
      endDay: home.lastDay,
      startDay: home.firstDay,
      ...(home.notes ? { dayNotes: home.notes } : {})
    },
    ...(trip.proposal ? { proposal: trip.proposal } : {})
  };
}
