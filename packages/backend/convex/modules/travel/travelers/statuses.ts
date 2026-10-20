import type { Infer } from 'convex/values';
import type { Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';
import { type OrganizationRoster, systemRoster } from '#convex/modules/auth/workspace';
import { paymentFor, requiresTripPayment } from '#convex/modules/payments/index';
import type { TripTravelerValidators } from '#convex/modules/travel/travelers/schema';

export type TravelerStatus = Infer<typeof TripTravelerValidators.status>;

/** Reads one row per roster member so rows left behind by departed members never count. */
export async function travelersForTrip(
  ctx: MutationCtx | QueryCtx,
  tripId: Id<'trips'>,
  userIds: string[]
) {
  const rows = await Promise.all(
    userIds.map((userId) =>
      ctx.db
        .query('tripTravelers')
        .withIndex('by_tripId_and_userId', (query) =>
          query.eq('tripId', tripId).eq('userId', userId)
        )
        .first()
    )
  );
  return rows.flatMap((row) => (row ? [row] : []));
}

export function rsvpStatus(status: TravelerStatus | undefined): Exclude<TravelerStatus, 'invited'> {
  if (status === 'maybe' || status === 'not_going') return status;
  return 'going';
}

/**
 * RSVP per current member, without a session (scheduled code, waits, polls). Members with no
 * row yet read as going; invited people without an account never appear.
 */
export async function statusesForTrip(
  ctx: MutationCtx | QueryCtx,
  tripId: Id<'trips'>,
  organizationId: string,
  loadedRoster?: OrganizationRoster
) {
  const roster = loadedRoster ?? (await systemRoster(ctx, organizationId));
  const rows = await travelersForTrip(
    ctx,
    tripId,
    roster.members.map((member) => member.userId)
  );
  const byUserId = new Map(rows.flatMap((row) => (row.userId ? [[row.userId, row] as const] : [])));
  const trip = await ctx.db.get('trips', tripId);
  return Promise.all(
    roster.members.map(async (member) => ({
      name: member.name,
      status:
        trip &&
        requiresTripPayment(trip, member.userId) &&
        !(await paymentFor(ctx, tripId, member.userId))?.paid &&
        !['maybe', 'not_going'].includes(byUserId.get(member.userId)?.status ?? '')
          ? ('invited' as const)
          : rsvpStatus(byUserId.get(member.userId)?.status),
      userId: member.userId
    }))
  );
}
