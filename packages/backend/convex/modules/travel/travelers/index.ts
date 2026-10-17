import { ConvexError } from 'convex/values';
import type { Id } from '#convex-generated/dataModel';
import type { MutationCtx } from '#convex-generated/server';
import { workspaceRoster } from '#convex/modules/auth/workspace';
import { PollSignals } from '#convex/modules/polls/signals';
import { syncTripConditions } from '#convex/modules/travel/issues/sync';
import {
  rsvpStatus,
  statusesForTrip,
  type TravelerStatus,
  travelersForTrip
} from '#convex/modules/travel/travelers/statuses';
import { isTripAdmin, type TripCtx } from '#convex/modules/travel/trips/ctx';

export type { TravelerStatus };

export async function listTravelers(ctx: TripCtx) {
  const roster = await workspaceRoster(ctx, ctx.workspace);
  const rows = await travelersForTrip(
    ctx,
    ctx.trip._id,
    roster.members.map((member) => member.userId)
  );
  const byUserId = new Map(rows.flatMap((row) => (row.userId ? [[row.userId, row] as const] : [])));
  return roster.members
    .map((member) => {
      const row = byUserId.get(member.userId);
      return {
        handle: member.handle,
        id: member.userId,
        image: member.image ?? null,
        invitationId: row?.invitationId ?? null,
        name: member.name,
        status: rsvpStatus(row?.status),
        userId: member.userId
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function seedTravelers(ctx: MutationCtx, trip: TripCtx<MutationCtx>): Promise<void> {
  const roster = await workspaceRoster(ctx, trip.workspace);
  const now = Date.now();
  await Promise.all(
    roster.members.map((member) =>
      ctx.db.insert('tripTravelers', {
        handle: member.handle,
        name: member.name,
        organizationId: trip.workspace.organizationId,
        status: 'going',
        tripId: trip.trip._id,
        updatedAt: now,
        userId: member.userId
      })
    )
  );
}

export async function setTravelerStatus(
  ctx: TripCtx<MutationCtx>,
  userId: string,
  status: TravelerStatus
): Promise<null> {
  if (ctx.trip.archive !== undefined) throw new ConvexError('Archived trips are read-only');
  if (status === 'invited') throw new ConvexError('RSVP with going, maybe, or not going');
  if (userId !== ctx.workspace.userId && !isTripAdmin(ctx)) {
    throw new ConvexError('You can only update your own RSVP');
  }
  const roster = await workspaceRoster(ctx, ctx.workspace);
  const member = roster.members.find((item) => item.userId === userId);
  if (!member) throw new ConvexError('Traveler not found in this group');
  const existing = await ctx.db
    .query('tripTravelers')
    .withIndex('by_tripId_and_userId', (query) =>
      query.eq('tripId', ctx.trip._id).eq('userId', userId)
    )
    .unique();
  const now = Date.now();
  if (existing) {
    await ctx.db.patch('tripTravelers', existing._id, { status, updatedAt: now });
  } else {
    await ctx.db.insert('tripTravelers', {
      handle: member.handle,
      name: member.name,
      organizationId: ctx.workspace.organizationId,
      status,
      tripId: ctx.trip._id,
      updatedAt: now,
      userId
    });
  }
  // RSVPs change the shared trip directly, so "done when" rules over them re-check here.
  await syncTripConditions(ctx);
  // RSVP waits and trip-poll eligibility (not going travelers cannot vote) re-check after.
  await PollSignals.scheduleTripTravelers(ctx, {
    organizationId: ctx.trip.organizationId,
    tripId: ctx.trip._id
  });
  return null;
}

export async function claimInvitation(
  ctx: MutationCtx,
  invitationId: string,
  workspace: { organizationId: string; userId: string; viewerName: string }
): Promise<Id<'trips'> | null> {
  const traveler = await ctx.db
    .query('tripTravelers')
    .withIndex('by_invitationId', (query) => query.eq('invitationId', invitationId))
    .unique();
  if (!traveler || traveler.organizationId !== workspace.organizationId) return null;
  await ctx.db.patch('tripTravelers', traveler._id, {
    name: workspace.viewerName,
    status: 'going',
    updatedAt: Date.now(),
    userId: workspace.userId
  });
  await PollSignals.scheduleTripTravelers(ctx, {
    organizationId: traveler.organizationId,
    tripId: traveler.tripId
  });
  return traveler.tripId;
}

export async function goingCount(ctx: TripCtx): Promise<number> {
  return (await listTravelers(ctx)).filter((traveler) => traveler.status === 'going').length;
}

/** Per-trip RSVP overlay on the workspace roster. */
// oxlint-disable-next-line unicorn/no-static-only-class -- callers use this class, not loose functions
export class TripTravelers {
  static claimInvitation = claimInvitation;
  static goingCount = goingCount;
  static list = listTravelers;
  static seed = seedTravelers;
  static setStatus = setTravelerStatus;
  static statusesForTrip = statusesForTrip;
}
