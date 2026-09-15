import { v } from 'convex/values';
import { TripIssues } from '#convex/modules/travel/issues/index';
import { TripIssueValidators } from '#convex/modules/travel/issues/schema';
import { tripQuery } from '#convex/modules/travel/trips/ctx';

export const run = tripQuery({
  args: {},
  returns: v.array(TripIssueValidators.listItem),
  handler: (ctx) => TripIssues.list(ctx, ctx.trip._id)
});
