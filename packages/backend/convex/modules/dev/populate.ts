import { ConvexError, v } from 'convex/values';
import { internalWorkspaceMutation, type Workspace } from '#convex/modules/auth/workspace';
import {
  ItineraryActivity,
  type ItineraryActivityInput
} from '#convex/modules/travel/activities/index';
import { TripActivityValidators } from '#convex/modules/travel/activities/schema';
import {
  TripDestination,
  type TripDestinationStopInput
} from '#convex/modules/travel/destinations/index';
import { TripDestinationValidators } from '#convex/modules/travel/destinations/schema';
import { assertPlanner, loadTripContext, withSeedWrites } from '#convex/modules/travel/trips/ctx';
import type { Id } from '#convex-generated/dataModel';
import type { MutationCtx } from '#convex-generated/server';
import { assertLocalDevelopment } from './local';

export const seedItineraryArgs = {
  activities: v.array(
    v.object({
      destinationIndex: v.number(),
      input: TripActivityValidators.input
    })
  ),
  additionalDestinations: v.array(TripDestinationValidators.stopInput),
  primary: v.optional(
    v.object({
      dayNotes: v.optional(v.string()),
      endDay: v.optional(v.number()),
      startDay: v.optional(v.number())
    })
  ),
  tripId: v.id('trips')
};

export type SeedItineraryActivity = {
  destinationIndex: number;
  input: ItineraryActivityInput;
};

export type SeedItineraryInput = {
  activities: SeedItineraryActivity[];
  additionalDestinations: TripDestinationStopInput[];
  primary?: {
    dayNotes?: string;
    endDay?: number;
    startDay?: number;
  };
  tripId: Id<'trips'>;
};

async function writeInOrder<Item>(
  items: readonly Item[],
  write: (item: Item) => Promise<void>,
  index = 0
): Promise<void> {
  const item = items[index];
  if (item === undefined) return;
  await write(item);
  await writeInOrder(items, write, index + 1);
}

/** Fill a shared trip's itinerary in one local-only transaction, skipping the idea workflow. */
export async function populateSeedItinerary(
  ctx: MutationCtx,
  input: SeedItineraryInput,
  workspace: Workspace
): Promise<null> {
  assertLocalDevelopment();
  return await writeSeedItinerary(ctx, input, workspace);
}

/** Writes destinations and activities. Callers must already have gated this to local development. */
export async function writeSeedItinerary(
  ctx: MutationCtx,
  input: SeedItineraryInput,
  workspace: Workspace
): Promise<null> {
  const trip = await loadTripContext(ctx, input.tripId, workspace);
  assertPlanner(trip);
  if (trip.trip.proposal) throw new ConvexError('Start from the shared trip');
  if (trip.trip.archive !== undefined) throw new ConvexError('Archived trips are read-only');

  return await withSeedWrites(async () => {
    const existing = await TripDestination.forTrip(ctx, input.tripId);
    const primary = existing[0];
    if (input.primary && primary) {
      await (await TripDestination.find(ctx, input.tripId, primary._id)).update(
        input.primary.dayNotes,
        input.primary.startDay,
        input.primary.endDay
      );
    }
    const existingPlaceIds = new Set(existing.map(({ placeId }) => placeId));
    await writeInOrder(input.additionalDestinations, async (destination) => {
      if (existingPlaceIds.has(destination.placeId)) return;
      await TripDestination.add(trip, destination);
      existingPlaceIds.add(destination.placeId);
    });
    const [destinations, existingActivities] = await Promise.all([
      TripDestination.forTrip(ctx, input.tripId),
      ItineraryActivity.forTrip(ctx, input.tripId)
    ]);
    const titlesByDestination = new Map<string, Set<string>>();
    for (const activity of existingActivities) {
      const titles = titlesByDestination.get(activity.destinationId) ?? new Set<string>();
      titles.add(activity.title);
      titlesByDestination.set(activity.destinationId, titles);
    }
    await writeInOrder(input.activities, async (activity) => {
      const destination = destinations[activity.destinationIndex];
      if (!destination) {
        throw new ConvexError(`Seed itinerary is missing destination ${activity.destinationIndex}`);
      }
      const titles = titlesByDestination.get(destination._id) ?? new Set<string>();
      if (titles.has(activity.input.title)) return;
      await ItineraryActivity.add(ctx, input.tripId, destination._id, activity.input);
      titles.add(activity.input.title);
      titlesByDestination.set(destination._id, titles);
    });
    return null;
  });
}

export const write = internalWorkspaceMutation({
  args: seedItineraryArgs,
  returns: v.null(),
  handler: async (ctx, args) => await writeSeedItinerary(ctx, args, ctx.workspace)
});
