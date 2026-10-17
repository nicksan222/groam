import { v } from 'convex/values';
import { TripPacking } from '#convex/modules/travel/packing/index';
import { TripPersonalPacking } from '#convex/modules/travel/packing/personal';
import { TripPackingValidators } from '#convex/modules/travel/packing/schema';
import { listTravelers } from '#convex/modules/travel/travelers/index';
import {
  internalMutableTripMutation,
  internalSharedTripMutation,
  internalSharedTripQuery,
  internalTripQuery
} from '#convex/modules/travel/trips/ctx';
import { TripVersions } from '#convex/modules/travel/versions/index';

export const list = internalTripQuery({
  args: {},
  returns: TripPackingValidators.list,
  handler: async (ctx) => await TripPacking.list(ctx)
});

export const add = internalMutableTripMutation({
  args: TripPackingValidators.addInput,
  returns: TripPackingValidators.writtenItem,
  handler: async (ctx, { label, quantity }) => await TripPacking.add(ctx, label, quantity)
});

export const update = internalMutableTripMutation({
  args: TripPackingValidators.updateInput,
  returns: TripPackingValidators.writtenItem,
  handler: async (ctx, { itemId, label, quantity }) =>
    await TripPacking.update(ctx, itemId, { label, quantity })
});

export const bring = internalMutableTripMutation({
  args: TripPackingValidators.bringInput,
  returns: v.null(),
  handler: async (ctx, input) => {
    await TripPacking.bring(ctx, input);
    if (input.count > 0) await TripVersions.requestBringerReview(ctx, input.userId);
    return null;
  }
});

export const remove = internalMutableTripMutation({
  args: { itemId: v.id('tripPackingItems') },
  returns: v.null(),
  handler: async (ctx, { itemId }) => await TripPacking.remove(ctx, itemId)
});

/** Everyone the assistant may assign: userId, name, and RSVP for the trip's travelers. */
export const travelers = internalTripQuery({
  args: {},
  returns: v.array(v.object({ name: v.string(), status: v.string(), userId: v.string() })),
  handler: async (ctx) =>
    (await listTravelers(ctx)).map(({ name, status, userId }) => ({ name, status, userId }))
});

// Personal list twins act for the run creator only (`asRun`); there is no userId argument.
export const personalList = internalSharedTripQuery({
  args: {},
  returns: TripPackingValidators.personalList,
  handler: async (ctx) => await TripPersonalPacking.list(ctx)
});

export const personalAdd = internalSharedTripMutation({
  args: TripPackingValidators.personalAddInput,
  returns: TripPackingValidators.personalItem,
  handler: async (ctx, { label }) => await TripPersonalPacking.add(ctx, label)
});

export const personalUpdate = internalSharedTripMutation({
  args: TripPackingValidators.personalUpdateInput,
  returns: TripPackingValidators.personalItem,
  handler: async (ctx, { itemId, label, packed }) =>
    await TripPersonalPacking.update(ctx, itemId, { label, packed })
});

export const personalRemove = internalSharedTripMutation({
  args: { itemId: v.id('tripPersonalPackingItems') },
  returns: v.null(),
  handler: async (ctx, { itemId }) => await TripPersonalPacking.remove(ctx, itemId)
});
