import { v } from 'convex/values';
import { internalMutation } from '#convex-generated/server';
import { Polls } from '#convex/modules/polls/index';
import { PollSignals } from '#convex/modules/polls/signals';

/** Scheduled at `closesAt`. */
export const closeScheduled = internalMutation({
  args: { pollId: v.id('polls') },
  returns: v.null(),
  handler: (ctx, { pollId }) => Polls.closeScheduled(ctx, pollId)
});

/** `PollSignals.openPolls`, scheduled by a roster change or a full batch. */
export const signalOpen = internalMutation({
  args: {
    after: v.optional(v.number()),
    scope: v.union(v.object({ organizationId: v.string() }), v.object({ tripId: v.id('trips') }))
  },
  returns: v.null(),
  handler: async (ctx, { after, scope }) => {
    await PollSignals.openPolls(ctx, scope, after === undefined ? {} : { after });
    return null;
  }
});

/** `PollSignals.tripTravelers`, scheduled by an RSVP or roster change. */
export const signalTravelers = internalMutation({
  args: { tripId: v.id('trips') },
  returns: v.null(),
  handler: async (ctx, { tripId }) => {
    await PollSignals.tripTravelers(ctx, tripId);
    return null;
  }
});
