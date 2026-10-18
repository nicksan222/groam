import { v } from 'convex/values';
import { query } from '#convex-generated/server';
import { Research } from '#convex/modules/discussions/research/index';
import { ResearchValidators } from '#convex/modules/discussions/research/schema';

/** Researches of a trip, newest activity first. Requires access to the trip. */
export const run = query({
  args: { kind: v.literal('research'), tripId: v.id('trips') },
  returns: v.array(ResearchValidators.listed),
  handler: (ctx, { kind, tripId }) => Research.listForTrip(ctx, tripId, kind)
});
