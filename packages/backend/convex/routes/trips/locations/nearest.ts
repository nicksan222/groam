import { v } from 'convex/values';
import { workspaceQuery } from '#convex/modules/auth/workspace';
import { TripDestinationValidators } from '#convex/modules/travel/destinations/schema';
import { TripLocationQueries } from '#convex/modules/travel/locations/query';

const locationType = v.union(v.literal('activity'), v.literal('destination'), v.literal('trip'));

export const run = workspaceQuery({
  args: {
    limit: v.number(),
    maxDistance: v.number(),
    point: TripDestinationValidators.coordinates,
    type: locationType
  },
  returns: v.array(
    v.object({
      coordinates: TripDestinationValidators.coordinates,
      distance: v.number(),
      key: v.string()
    })
  ),
  handler: (ctx, { limit, maxDistance, point, type }) =>
    TripLocationQueries.nearest(ctx, point, type, limit, maxDistance)
});
