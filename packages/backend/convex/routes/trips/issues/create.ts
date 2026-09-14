import { v } from 'convex/values';
import { TripIssues } from '#convex/modules/travel/issues/index';
import { TripIssueValidators } from '#convex/modules/travel/issues/schema';
import { tripMutation } from '#convex/modules/travel/trips/ctx';

export const run = tripMutation({
  args: TripIssueValidators.createInput,
  returns: v.id('tripIssues'),
  handler: (ctx, { body, title }) => TripIssues.create(ctx, ctx.trip._id, title, body)
});
