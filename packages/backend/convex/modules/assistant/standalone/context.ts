import { ConvexError, v } from 'convex/values';
import { internalQuery } from '#convex-generated/server';

export const issue = internalQuery({
  args: { issueId: v.id('tripIssues') },
  returns: v.object({
    body: v.string(),
    id: v.id('tripIssues'),
    organizationId: v.string(),
    title: v.string(),
    tripId: v.id('trips'),
    tripName: v.string()
  }),
  handler: async (ctx, { issueId }) => {
    const stored = await ctx.db.get('tripIssues', issueId);
    if (!stored) throw new ConvexError('Trip issue not found');
    const trip = await ctx.db.get('trips', stored.tripId);
    if (!trip) throw new ConvexError('Trip not found');
    return {
      body: stored.body,
      id: stored._id,
      organizationId: stored.organizationId,
      title: stored.title,
      tripId: stored.tripId,
      tripName: trip.name
    };
  }
});
