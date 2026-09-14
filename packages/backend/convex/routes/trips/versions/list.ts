import { v } from 'convex/values';
import { tripQuery } from '#convex/modules/travel/trips/ctx';
import { TripVersions } from '#convex/modules/travel/versions/index';
import { TripVersionValidators } from '#convex/modules/travel/versions/schema';

export const run = tripQuery({
  args: {},
  returns: v.array(
    v.object({
      author: TripVersionValidators.author,
      baseUpdatedAt: v.number(),
      ideaName: v.string(),
      conflictCount: v.number(),
      feedbackCount: v.number(),
      id: v.id('tripProposals'),
      issueId: v.union(v.id('tripIssues'), v.null()),
      status: TripVersionValidators.status,
      submittedAt: v.union(v.number(), v.null()),
      title: v.string(),
      unresolvedFeedbackCount: v.number(),
      updatedAt: v.number(),
      workingTripId: v.id('trips')
    })
  ),
  handler: (ctx) => TripVersions.list(ctx, ctx.trip._id)
});
