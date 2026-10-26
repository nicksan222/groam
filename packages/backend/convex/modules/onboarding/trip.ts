import type { MutationCtx } from '#convex-generated/server';
import type { Workspace } from '#convex/modules/auth/workspace';
import { ItineraryActivity } from '#convex/modules/travel/activities/index';
import { TripDestination } from '#convex/modules/travel/destinations/index';
import { syncTripConditions } from '#convex/modules/travel/issues/sync';
import { TripPacking } from '#convex/modules/travel/packing/index';
import { TripPersonalPacking } from '#convex/modules/travel/packing/personal';
import { TripStay } from '#convex/modules/travel/stays/index';
import { TripTransfer } from '#convex/modules/travel/transfers/index';
import { withSeedWrites } from '#convex/modules/travel/trips/ctx';
import { createTrip } from '#convex/modules/travel/trips/index';
import { seedDemoPlanning } from './planning';

export async function seedDemoContent(ctx: MutationCtx & { workspace: Workspace }): Promise<void> {
  const trip = await withSeedWrites(
    async () => {
      const trip = await createTrip(
        ctx,
        {
          clientRequestId: 'onboarding-demo-trip-v1',
          name: 'Demo: A long weekend in Rome',
          currency: 'EUR',
          dateNotes: 'Example trip — pick your own dates. All costs and bookings are illustrative.',
          destination: {
            status: 'known',
            name: 'Rome, Italy',
            countryCode: 'IT',
            placeId: 'R:41485',
            coordinates: { latitude: 41.8933, longitude: 12.4829 }
          },
          duration: { totalDays: 3 },
          budget: { amount: 600 }
        },
        true
      );
      const tripId = trip.trip._id;
      const [destination] = await TripDestination.forTrip(ctx, tripId);
      if (!destination) throw new Error('Demo destination was not created');
      await (
        await TripDestination.find(ctx, tripId, destination._id)
      ).update(
        'Demo itinerary: edit the plan, compare an idea, and explore linked research.',
        1,
        3
      );
      await ItineraryActivity.add(ctx, tripId, destination._id, {
        title: 'Demo: Historic center walk',
        notes: 'Illustrative plan: leave time for breaks and check opening hours before booking.',
        schedule: { day: 1, timeBlock: 'afternoon' },
        cost: { amount: 0, split: 'per_person' }
      });
      await ItineraryActivity.add(ctx, tripId, destination._id, {
        title: 'Demo: Museum morning',
        notes: 'Example budget only. Research tickets and accessibility before choosing a museum.',
        schedule: { day: 2, timeBlock: 'morning' },
        cost: { amount: 20, split: 'per_person' }
      });
      await TripStay.add(ctx, tripId, destination._id, {
        title: 'Demo: Courtyard guesthouse',
        notes:
          'Fictional accommodation, not a reservation. Compare location, cancellation and accessibility.',
        schedule: { checkInDay: 1, checkOutDay: 3, checkInTime: '15:00', checkOutTime: '11:00' },
        cost: { amount: 240, split: 'total' }
      });
      await TripTransfer.setBoundary(ctx, tripId, 'arrival', {
        mode: 'public_transit',
        duration: { minutes: 45 },
        notes:
          'Demo estimate only: compare station-to-stay options after choosing arrival details.',
        cost: { amount: 12, split: 'per_person' }
      });
      const gear = await TripPacking.add(trip, 'Demo: Shared power adapter', 1);
      await TripPacking.bring(trip, { itemId: gear.id, count: 1, userId: ctx.workspace.userId });
      await TripPacking.add(trip, 'Demo: First-aid kit', 1);
      await TripPersonalPacking.add(trip, 'Demo: Comfortable walking shoes');
      await TripPersonalPacking.add(trip, 'Demo: Offline booking copies');
      await seedDemoPlanning(ctx, trip);
      return trip;
    },
    { offline: true }
  );
  // Seed writes batch condition checks; reconcile once after packing and the itinerary exist.
  await syncTripConditions(trip);
}
