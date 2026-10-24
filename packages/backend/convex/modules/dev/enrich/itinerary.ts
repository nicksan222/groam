import type { MutationCtx } from '#convex-generated/server';
import { TripDestination } from '#convex/modules/travel/destinations/index';
import { TripPacking } from '#convex/modules/travel/packing/index';
import { TripPersonalPacking } from '#convex/modules/travel/packing/personal';
import { TripStay } from '#convex/modules/travel/stays/index';
import { TripTransfer } from '#convex/modules/travel/transfers/index';
import type { MutableTripCtx } from '#convex/modules/travel/trips/ctx';
import { fixtureMoney } from './money';

export async function enrichItinerary(ctx: MutationCtx, trip: MutableTripCtx, scenario: number) {
  const tripId = trip.trip._id;
  const [destinations, stays] = await Promise.all([
    TripDestination.forTrip(ctx, tripId),
    TripStay.forTrip(ctx, tripId)
  ]);
  const createdStays = [];
  for (const destination of destinations.slice(0, 3)) {
    const title = `${destination.name.split(',')[0]} courtyard guesthouse`;
    if (stays.some((stay) => stay.destinationId === destination._id && stay.title === title))
      continue;
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Ordered local fixture writes.
    const createdStay = await TripStay.add(ctx, tripId, destination._id, {
      title,
      notes:
        'Local demo booking: two twin rooms, breakfast included. Free cancellation until seven days before arrival. Confirm step-free access with the host.',
      schedule: {
        checkInDay: destination.schedule?.startDay ?? 1,
        checkOutDay: destination.schedule?.endDay ?? 1,
        checkInTime: '15:00',
        ...(destination.schedule && destination.schedule.endDay > destination.schedule.startDay
          ? { checkOutTime: '11:00' }
          : {})
      },
      cost: {
        amount: fixtureMoney(320 + (scenario % 5) * 45, trip.trip.currency),
        split: 'total'
      }
    });
    createdStays.push(createdStay);
  }
  const boundaries = await TripTransfer.boundaryForTrip(ctx, tripId);
  if (!boundaries.some((transfer) => transfer.boundary === 'arrival') && destinations.length > 0) {
    await TripTransfer.setBoundary(ctx, tripId, 'arrival', {
      mode: 'public_transit',
      duration: { minutes: 45 },
      cost: { amount: fixtureMoney(12, trip.trip.currency), split: 'per_person' },
      notes:
        'Local demo estimate: station to accommodation. Allow an extra 20 minutes for luggage; buy tickets after confirming the arrival time.'
    });
  }
  const packingItems = await enrichSharedPacking(trip);
  await enrichPersonalPacking(trip);
  return {
    destinations,
    packingItems,
    stays: await TripStay.forTrip(ctx, tripId),
    createdStays: createdStays.length
  };
}

async function enrichSharedPacking(trip: MutableTripCtx) {
  const ctx = trip;
  const tripId = trip.trip._id;
  const packing = await TripPacking.forTrip(ctx, tripId);
  const labels = [
    'Universal power adapter',
    'Shared first-aid kit',
    'Reusable water bottles',
    'Compact umbrella'
  ];
  let packingItems = 0;
  for (const [index, label] of labels.entries()) {
    if (packing.some((item) => item.label === label)) continue;
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Each assignment needs its new item.
    const item = await TripPacking.add(trip, label, index === 2 ? 4 : 1);
    packingItems += 1;
    if (index < 2) {
      // oxlint-disable-next-line react-doctor/async-await-in-loop -- Each assignment needs its new item.
      await TripPacking.bring(trip, { count: 1, itemId: item.id, userId: trip.workspace.userId });
    }
  }
  return packingItems;
}

async function enrichPersonalPacking(trip: MutableTripCtx) {
  const personal = await TripPersonalPacking.list(trip);
  for (const [index, label] of [
    'Passport and offline booking copies',
    'Prescription medication',
    'Comfortable walking shoes'
  ].entries()) {
    if (personal.some((item) => item.label === label)) continue;
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Local fixtures preserve insertion order.
    const item = await TripPersonalPacking.add(trip, label);
    if (index === 0) {
      // oxlint-disable-next-line react-doctor/async-await-in-loop -- Update the newly created personal item.
      await TripPersonalPacking.update(trip, item.id, { packed: true });
    }
  }
}
