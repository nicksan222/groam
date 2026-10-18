import {
  type PaginationOptions,
  paginationOptsValidator,
  paginationResultValidator
} from 'convex/server';
import { v } from 'convex/values';
import { workspaceQuery } from '#convex/modules/auth/workspace';
import { TripVersions } from '#convex/modules/travel/versions/index';
import { TripVersionValidators } from '#convex/modules/travel/versions/schema';

const proposalListItem = v.object({
  author: TripVersionValidators.author,
  ideaName: v.string(),
  id: v.id('tripProposals'),
  reviewRequested: v.boolean(),
  sourceTripId: v.id('trips'),
  sourceTripName: v.string(),
  status: TripVersionValidators.status,
  title: v.string(),
  updatedAt: v.number(),
  workingTripId: v.id('trips')
});

export const run = workspaceQuery({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(proposalListItem),
  handler: (ctx, { paginationOpts }: { paginationOpts: PaginationOptions }) =>
    TripVersions.listWorkspace(ctx, paginationOpts)
});
