import { ConvexError } from 'convex/values';
import type { Doc } from '#convex-generated/dataModel';
import { defineWaitCondition, memoized } from '#convex/modules/assistant/waits/conditions/types';
import { type OrganizationRoster, systemRoster } from '#convex/modules/auth/workspace';
import { statusesForTrip } from '#convex/modules/travel/travelers/statuses';
import { findSeatedTrip } from '#convex/modules/travel/trips/visibility';

type RsvpCounts = { going: number; maybe: number; notGoing: number };
type LoadedTrip = { counts: RsvpCounts; trip: Doc<'trips'> } | null;

/**
 * Met once at least `going` current members are going. Members without an RSVP row count as
 * going, as on the trip's traveler list and for poll eligibility.
 */
export const rsvpCondition = defineWaitCondition({
  judge: (condition, loaded: LoadedTrip) => {
    if (!loaded) {
      return {
        met: false,
        progress: null,
        snapshot: { going: 0, kind: 'rsvp', maybe: 0, notGoing: 0, tripId: condition.tripId },
        summary: 'The trip was deleted'
      };
    }
    const { counts, trip } = loaded;
    return {
      met: counts.going >= condition.rule.going,
      progress: `${counts.going} of ${condition.rule.going} going`,
      snapshot: { ...counts, kind: 'rsvp', tripId: trip._id },
      summary: `RSVPs for '${trip.name}' — ${counts.going} going, ${counts.maybe} maybe, ${counts.notGoing} not going`
    };
  },
  kind: 'rsvp',
  label: async (ctx, condition) => {
    const trip = await ctx.db.get('trips', condition.tripId);
    const target = `${condition.rule.going} people going`;
    return trip ? `${target} for “${trip.name}”` : 'RSVPs on a deleted trip';
  },
  load: async (ctx, condition, memo): Promise<LoadedTrip> => {
    const trip = await ctx.db.get('trips', condition.tripId);
    if (!trip) return null;
    const roster = await memoized<Promise<OrganizationRoster>>(
      memo,
      `roster:${trip.organizationId}`,
      () => systemRoster(ctx, trip.organizationId)
    );
    const members = await statusesForTrip(ctx, trip._id, trip.organizationId, roster);
    const count = (status: string) => members.filter((member) => member.status === status).length;
    return {
      counts: { going: count('going'), maybe: count('maybe'), notGoing: count('not_going') },
      trip
    };
  },
  refId: (condition) => condition.tripId,
  validate: async (ctx, condition, scope) => {
    // The run acts for its creator, so it may only watch a trip they can read.
    const trip = await findSeatedTrip(ctx, condition.tripId, scope.viewer);
    if (!trip || trip.organizationId !== scope.organizationId) {
      throw new ConvexError('Trip not found');
    }
    if (trip.proposal) throw new ConvexError('RSVPs live on the shared trip, not on an idea');
    if (scope.tripId && scope.tripId !== trip._id) {
      throw new ConvexError('That trip is not this run’s trip');
    }
    if (!(Number.isInteger(condition.rule.going) && condition.rule.going >= 1)) {
      throw new ConvexError('A going count must be a whole number of at least 1');
    }
    return { tripId: trip._id };
  }
});
