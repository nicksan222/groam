import { v } from 'convex/values';
import { workspaceQuery } from '#convex/modules/auth/workspace';
import { TripDestinationValidators } from '#convex/modules/travel/destinations/schema';
import { TripLocationQueries } from '#convex/modules/travel/locations/query';

const locationType = v.union(v.literal('activity'), v.literal('destination'), v.literal('trip'));

export const run = workspaceQuery({
  args: {
    cursor: v.optional(v.string()),
    limit: v.number(),
    rectangle: v.object({
      east: v.number(),
      north: v.number(),
      south: v.number(),
      west: v.number()
    }),
    type: locationType
  },
  returns: v.object({
    nextCursor: v.union(v.string(), v.null()),
    results: v.array(
      v.object({
        coordinates: TripDestinationValidators.coordinates,
        key: v.string()
      })
    )
  }),
  handler: async (ctx, { cursor, limit, rectangle, type }) => {
    const result = await TripLocationQueries.region(ctx, rectangle, type, limit, cursor);
    return { nextCursor: result.nextCursor ?? null, results: result.results };
  }
});
