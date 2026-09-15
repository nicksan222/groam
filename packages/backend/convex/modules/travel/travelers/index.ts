import { ConvexError, type Infer } from 'convex/values';
import { workspaceRoster } from '#convex/modules/auth/workspace';
import type { TripTravelerValidators } from '#convex/modules/travel/travelers/schema';
import { isTripAdmin, type TripCtx } from '#convex/modules/travel/trips/ctx';
import type { Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';

const MAX_TRAVELERS = 100;

export type TravelerStatus = Infer<typeof TripTravelerValidators.status>;

async function travelersForTrip(ctx: MutationCtx | QueryCtx, tripId: Id<'trips'>) {
  const rows = await ctx.db
    .query('tripTravelers')
    .withIndex('by_tripId', (query) => query.eq('tripId', tripId))
    .take(MAX_TRAVELERS + 1);
  if (rows.length > MAX_TRAVELERS) {
    throw new ConvexError(`Trips support up to ${MAX_TRAVELERS} travelers`);
  }
  return rows;
}

function rsvpStatus(status: TravelerStatus | undefined): Exclude<TravelerStatus, 'invited'> {
  if (status === 'maybe' || status === 'not_going') return status;
  return 'going';
}

export async function listTravelers(ctx: TripCtx) {
  const [rows, roster] = await Promise.all([
    travelersForTrip(ctx, ctx.trip._id),
    workspaceRoster(ctx, ctx.workspace)
  ]);
  const byUserId = new Map(rows.flatMap((row) => (row.userId ? [[row.userId, row] as const] : [])));
  return roster.members
    .map((member) => {
      const row = byUserId.get(member.userId);
      return {
        email: member.email,
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
        email: member.email,
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
    return null;
  }
  await ctx.db.insert('tripTravelers', {
    email: member.email,
    name: member.name,
    organizationId: ctx.workspace.organizationId,
    status,
    tripId: ctx.trip._id,
    updatedAt: now,
    userId
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
  return traveler.tripId;
}

export async function goingCount(ctx: TripCtx): Promise<number> {
  return (await listTravelers(ctx)).filter((traveler) => traveler.status === 'going').length;
}

/** Per-trip RSVP overlay on the workspace roster. */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class TripTravelers {
  static claimInvitation = claimInvitation;
  static goingCount = goingCount;
  static list = listTravelers;
  static seed = seedTravelers;
  static setStatus = setTravelerStatus;
}
