import {
  type PaginationOptions,
  paginationOptsValidator,
  paginationResultValidator
} from 'convex/server';
import { v } from 'convex/values';
import { workspaceQuery } from '#convex/modules/auth/workspace';
import { listTrips } from '#convex/modules/travel/trips/index';

const tripListItemValidator = v.object({
  archivedAt: v.union(v.number(), v.null()),
  coverUrl: v.union(v.string(), v.null()),
  dateNotes: v.union(v.string(), v.null()),
  destination: v.union(v.string(), v.null()),
  favorite: v.boolean(),
  id: v.id('trips'),
  shortId: v.optional(v.string()),
  lastUpdatedAt: v.number(),
  name: v.string(),
  nextAction: v.string(),
  outstandingActionCount: v.number()
});

export const run = workspaceQuery({
  args: {
    includeArchived: v.optional(v.boolean()),
    paginationOpts: paginationOptsValidator
  },
  returns: paginationResultValidator(tripListItemValidator),
  handler: (
    ctx,
    {
      includeArchived,
      paginationOpts
    }: { includeArchived?: boolean; paginationOpts: PaginationOptions }
  ) => listTrips(ctx, paginationOpts, { includeArchived })
});
