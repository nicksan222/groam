import { v } from 'convex/values';
import { internal } from '#convex-generated/api';
import { internalMutation } from '#convex-generated/server';
import { systemWorkspace } from '#convex/modules/auth/workspace';
import { syncTripConditions } from '#convex/modules/travel/issues/sync';
import { attachTrip, roleFor } from '#convex/modules/travel/trips/ctx';

const TRIPS_PER_PAGE = 25;

/**
 * Re-checks every shared trip of a group after its roster changed: the "travelers going" and
 * budget facts count the live roster. It pages through the trips and gives each its own
 * transaction, so a large group never loops in the write that changed membership.
 */
export const organization = internalMutation({
  args: { cursor: v.optional(v.string()), organizationId: v.string() },
  returns: v.null(),
  handler: async (ctx, { cursor, organizationId }) => {
    const page = await ctx.db
      .query('trips')
      .withIndex('by_organizationId_and_proposal_sourceTripId_and_updatedAt', (query) =>
        query.eq('organizationId', organizationId).eq('proposal.sourceTripId', undefined)
      )
      .paginate({ cursor: cursor ?? null, numItems: TRIPS_PER_PAGE });
    await Promise.all(
      page.page
        .filter((trip) => trip.archive === undefined)
        .map((trip) =>
          ctx.scheduler.runAfter(0, internal.modules.travel.issues.resync.trip, {
            tripId: trip._id
          })
        )
    );
    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.modules.travel.issues.resync.organization, {
        cursor: page.continueCursor,
        organizationId
      });
    }
    return null;
  }
});

export const trip = internalMutation({
  args: { tripId: v.id('trips') },
  returns: v.null(),
  handler: async (ctx, { tripId }) => {
    const data = await ctx.db.get('trips', tripId);
    if (!data || data.proposal || data.archive !== undefined) return null;
    const workspace = systemWorkspace(data.organizationId);
    await syncTripConditions(
      attachTrip(ctx, data, workspace, roleFor(data, workspace.userId, workspace.organizationRole))
    );
    return null;
  }
});
