import { ConvexError, type Infer, v } from 'convex/values';
import { ItineraryActivity } from '#convex/modules/travel/activities/index';
import { TripActivityValidators } from '#convex/modules/travel/activities/schema';
import { ensureTripCoversDay, TripDestination } from '#convex/modules/travel/destinations/index';
import { TripDestinationValidators } from '#convex/modules/travel/destinations/schema';
import { TripStay } from '#convex/modules/travel/stays/index';
import { TripTransfer } from '#convex/modules/travel/transfers/index';
import { TripTransferValidators } from '#convex/modules/travel/transfers/schema';
import { tripCostSplit, tripCostSplitValidator } from '#convex/modules/travel/trips/costs';
import {
  internalDestinationMutation,
  internalTripMutation,
  type MutableTripCtx
} from '#convex/modules/travel/trips/ctx';
import { updateTrip } from '#convex/modules/travel/trips/index';
import { normalizeCost } from '#convex/modules/travel/trips/normalize';
import type { Doc, Id } from '#convex-generated/dataModel';

function assertAgentCanWrite(ctx: MutableTripCtx): void {
  if (ctx.trip.proposal?.status !== 'draft') {
    throw new ConvexError('Only a draft idea can be written to');
  }
}

const activityPatch = v.object({
  address: v.optional(v.string()),
  costAmount: v.optional(v.union(v.number(), v.null())),
  costSplit: v.optional(tripCostSplitValidator),
  day: v.optional(v.number()),
  notes: v.optional(v.string()),
  timeBlock: v.optional(TripActivityValidators.timeBlock),
  title: v.optional(v.string())
});

const stayPatch = v.object({
  address: v.optional(v.string()),
  checkInDay: v.optional(v.number()),
  checkInTime: v.optional(v.string()),
  checkOutDay: v.optional(v.number()),
  checkOutTime: v.optional(v.string()),
  costAmount: v.optional(v.union(v.number(), v.null())),
  costSplit: v.optional(tripCostSplitValidator),
  notes: v.optional(v.string()),
  title: v.optional(v.string())
});

function patchedCost(
  current: Doc<'tripDestinationActivities'>['cost'] | Doc<'tripDestinationStays'>['cost'],
  amount: number | null | undefined,
  split: 'per_person' | 'total' | undefined
) {
  if (amount === null) return undefined;
  if (amount === undefined) return current;
  return { amount: normalizeCost(amount, 'itinerary cost') ?? 0, split: tripCostSplit(split) };
}

function optionalTextField(
  key: string,
  patchValue: string | undefined,
  current: string | undefined
) {
  const value = patchValue === undefined ? current : patchValue;
  return value ? { [key]: value } : {};
}

function activityScheduleFrom(
  data: Doc<'tripDestinationActivities'>,
  patch: Parameters<typeof activityInputFrom>[1]
) {
  return {
    day: patch.day ?? data.schedule.day,
    timeBlock: patch.timeBlock ?? data.schedule.timeBlock,
    ...(data.schedule.endDay === undefined ? {} : { endDay: data.schedule.endDay }),
    ...(data.schedule.endTime ? { endTime: data.schedule.endTime } : {}),
    ...(data.schedule.startTime ? { startTime: data.schedule.startTime } : {})
  };
}

function activityInputFrom(
  data: Doc<'tripDestinationActivities'>,
  patch: {
    address?: string;
    costAmount?: number | null;
    costSplit?: 'per_person' | 'total';
    day?: number;
    notes?: string;
    timeBlock?: Infer<typeof TripActivityValidators.timeBlock>;
    title?: string;
  }
) {
  const cost = patchedCost(data.cost, patch.costAmount, patch.costSplit);
  return {
    ...optionalTextField('address', patch.address, data.address),
    ...(cost ? { cost } : {}),
    ...optionalTextField('notes', patch.notes, data.notes),
    schedule: activityScheduleFrom(data, patch),
    title: patch.title ?? data.title
  };
}

function stayScheduleFrom(
  data: Doc<'tripDestinationStays'>,
  patch: Parameters<typeof stayInputFrom>[1]
) {
  return {
    checkInDay: patch.checkInDay ?? data.schedule.checkInDay,
    checkOutDay: patch.checkOutDay ?? data.schedule.checkOutDay,
    ...optionalTextField('checkInTime', patch.checkInTime, data.schedule.checkInTime),
    ...optionalTextField('checkOutTime', patch.checkOutTime, data.schedule.checkOutTime)
  };
}

function stayInputFrom(
  data: Doc<'tripDestinationStays'>,
  patch: {
    address?: string;
    checkInDay?: number;
    checkInTime?: string;
    checkOutDay?: number;
    checkOutTime?: string;
    costAmount?: number | null;
    costSplit?: 'per_person' | 'total';
    notes?: string;
    title?: string;
  }
) {
  const cost = patchedCost(data.cost, patch.costAmount, patch.costSplit);
  return {
    ...optionalTextField('address', patch.address, data.address),
    ...(cost ? { cost } : {}),
    ...optionalTextField('notes', patch.notes, data.notes),
    schedule: stayScheduleFrom(data, patch),
    title: patch.title ?? data.title
  };
}

function budgetInput(current: Doc<'trips'>, budgetAmount: number | null | undefined) {
  if (budgetAmount === undefined) return current.budget ? { budget: current.budget } : {};
  return budgetAmount === null ? {} : { budget: { amount: budgetAmount } };
}

function dateNotesInput(current: Doc<'trips'>, dateNotes: string | null | undefined) {
  if (dateNotes === undefined) return current.dateNotes ? { dateNotes: current.dateNotes } : {};
  return dateNotes ? { dateNotes } : {};
}

function durationInput(current: Doc<'trips'>, totalDays: number | undefined) {
  if (totalDays === undefined && !current.duration) return {};
  return { duration: { ...current.duration, ...(totalDays === undefined ? {} : { totalDays }) } };
}

export const updateActivity = internalTripMutation({
  args: {
    activityId: v.id('tripDestinationActivities'),
    patch: activityPatch
  },
  returns: v.null(),
  handler: async (ctx, { activityId, patch }) => {
    assertAgentCanWrite(ctx);
    const activity = await ItineraryActivity.find(ctx, ctx.trip._id, activityId);
    return await activity.update(activityInputFrom(activity.data, patch));
  }
});

export const removeActivity = internalTripMutation({
  args: { activityId: v.id('tripDestinationActivities') },
  returns: v.null(),
  handler: async (ctx, { activityId }) => {
    assertAgentCanWrite(ctx);
    return await (await ItineraryActivity.find(ctx, ctx.trip._id, activityId)).delete();
  }
});

export const updateStay = internalTripMutation({
  args: {
    patch: stayPatch,
    stayId: v.id('tripDestinationStays')
  },
  returns: v.null(),
  handler: async (ctx, { patch, stayId }) => {
    assertAgentCanWrite(ctx);
    const stay = await TripStay.find(ctx, ctx.trip._id, stayId);
    return await stay.update(stayInputFrom(stay.data, patch));
  }
});

export const removeStay = internalTripMutation({
  args: { stayId: v.id('tripDestinationStays') },
  returns: v.null(),
  handler: async (ctx, { stayId }) => {
    assertAgentCanWrite(ctx);
    return await (await TripStay.find(ctx, ctx.trip._id, stayId)).delete();
  }
});

export const addDestination = internalTripMutation({
  args: { input: TripDestinationValidators.stopInput },
  returns: v.id('tripDestinations'),
  handler: async (ctx, { input }) => {
    assertAgentCanWrite(ctx);
    if (input.schedule) await ensureTripCoversDay(ctx, input.schedule.endDay);
    return await TripDestination.add(ctx, input);
  }
});

export const setDestinationSchedule = internalDestinationMutation({
  args: {
    dayNotes: v.optional(v.string()),
    endDay: v.number(),
    startDay: v.number()
  },
  returns: v.object({
    endDay: v.number(),
    startDay: v.number(),
    totalDurationDays: v.number()
  }),
  handler: async (ctx, { dayNotes, endDay, startDay }) => {
    assertAgentCanWrite(ctx);
    return await TripDestination.fromCtx(ctx).setSchedule(startDay, endDay, dayNotes);
  }
});

export const removeDestination = internalDestinationMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    assertAgentCanWrite(ctx);
    return await TripDestination.fromCtx(ctx).delete();
  }
});

const transferInput = TripTransferValidators.input;

export const setTransfer = internalTripMutation({
  args: {
    input: transferInput,
    target: v.union(
      v.object({ kind: v.literal('arrival') }),
      v.object({ kind: v.literal('departure') }),
      v.object({
        fromDestinationId: v.id('tripDestinations'),
        kind: v.literal('destination'),
        toDestinationId: v.id('tripDestinations')
      }),
      v.object({
        fromActivityId: v.id('tripDestinationActivities'),
        kind: v.literal('activity'),
        toActivityId: v.id('tripDestinationActivities')
      })
    )
  },
  returns: v.string(),
  handler: async (ctx, { input, target }): Promise<string> => {
    assertAgentCanWrite(ctx);
    const tripId = ctx.trip._id;
    if (target.kind === 'arrival' || target.kind === 'departure') {
      const id: Id<'tripBoundaryTransfers'> = await TripTransfer.setBoundary(
        ctx,
        tripId,
        target.kind,
        input
      );
      return id;
    }
    if (target.kind === 'destination') {
      const id: Id<'tripDestinationTransfers'> = await TripTransfer.setDestination({
        ctx,
        fromDestinationId: target.fromDestinationId,
        input,
        toDestinationId: target.toDestinationId,
        tripId
      });
      return id;
    }
    const id: Id<'tripActivityTransfers'> = await TripTransfer.setActivity({
      ctx,
      fromActivityId: target.fromActivityId,
      input,
      toActivityId: target.toActivityId,
      tripId
    });
    return id;
  }
});

export const removeTransfer = internalTripMutation({
  args: {
    target: v.union(
      v.object({
        kind: v.literal('arrival'),
        transferId: v.id('tripBoundaryTransfers')
      }),
      v.object({
        kind: v.literal('departure'),
        transferId: v.id('tripBoundaryTransfers')
      }),
      v.object({
        kind: v.literal('destination'),
        transferId: v.id('tripDestinationTransfers')
      }),
      v.object({
        kind: v.literal('activity'),
        transferId: v.id('tripActivityTransfers')
      })
    )
  },
  returns: v.null(),
  handler: async (ctx, { target }) => {
    assertAgentCanWrite(ctx);
    const tripId = ctx.trip._id;
    if (target.kind === 'arrival' || target.kind === 'departure') {
      return await TripTransfer.removeBoundary(ctx, tripId, target.transferId);
    }
    if (target.kind === 'destination') {
      return await TripTransfer.removeDestination(ctx, tripId, target.transferId);
    }
    return await TripTransfer.removeActivity(ctx, tripId, target.transferId);
  }
});

export const updateTripDetails = internalTripMutation({
  args: {
    budgetAmount: v.optional(v.union(v.number(), v.null())),
    dateNotes: v.optional(v.union(v.string(), v.null())),
    name: v.optional(v.string()),
    totalDays: v.optional(v.number())
  },
  returns: v.null(),
  handler: async (ctx, { budgetAmount, dateNotes, name, totalDays }) => {
    assertAgentCanWrite(ctx);
    const trip = ctx.trip;
    return await updateTrip(ctx, trip._id, {
      ...budgetInput(trip, budgetAmount),
      currency: trip.currency,
      ...dateNotesInput(trip, dateNotes),
      destination: trip.destination,
      ...durationInput(trip, totalDays),
      name: name ?? trip.name,
      ...(trip.startDate ? { startDate: trip.startDate } : {})
    });
  }
});
