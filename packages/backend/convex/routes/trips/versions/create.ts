import { v } from 'convex/values';
import { tripMutation } from '#convex/modules/travel/trips/ctx';
import { TripVersions } from '#convex/modules/travel/versions/index';

export const run = tripMutation({
  args: {
    ideaName: v.optional(v.string()),
    issueId: v.optional(v.id('tripIssues')),
    title: v.optional(v.string())
  },
  returns: v.object({
    ideaName: v.string(),
    proposalId: v.id('tripProposals'),
    workingTripId: v.id('trips')
  }),
  handler: (ctx, { ideaName, issueId, title }) =>
    TripVersions.create(ctx, ctx.trip._id, { ideaName, issueId, title })
});
