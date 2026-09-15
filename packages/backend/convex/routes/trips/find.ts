import { v } from 'convex/values';
import { workspaceQuery } from '#convex/modules/auth/workspace';
import { findTrip } from '#convex/modules/travel/trips/index';
import { tripDetailValidator } from './get';

export const run = workspaceQuery({
  args: { tripId: v.id('trips') },
  returns: v.union(v.null(), tripDetailValidator),
  handler: (ctx, { tripId }) => findTrip(ctx, tripId)
});
