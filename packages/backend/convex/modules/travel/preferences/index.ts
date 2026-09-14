import { ConvexError } from 'convex/values';
import { loadTripContext } from '#convex/modules/travel/trips/ctx';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';

const MAX_PREFERENCES_PER_USER = 200;

async function favoriteTripIds(ctx: QueryCtx, organizationId: string, userId: string) {
  const preferences = await ctx.db
    .query('tripPreferences')
    .withIndex('by_organizationId_and_userId', (query) =>
      query.eq('organizationId', organizationId).eq('userId', userId)
    )
    .take(MAX_PREFERENCES_PER_USER + 1);
  if (preferences.length > MAX_PREFERENCES_PER_USER) {
    throw new ConvexError(`Users can favourite up to ${MAX_PREFERENCES_PER_USER} trips`);
  }
  return new Set(
    preferences.filter((preference) => preference.favorite).map((preference) => preference.tripId)
  );
}

async function setFavorite(
  ctx: MutationCtx,
  tripId: Id<'trips'>,
  favorite: boolean
): Promise<null> {
  const trip = await loadTripContext(ctx, tripId);
  if (trip.trip.proposal) {
    throw new ConvexError('Idea trips cannot be favourited');
  }
  const existing = await ctx.db
    .query('tripPreferences')
    .withIndex('by_tripId_and_userId', (query) =>
      query.eq('tripId', tripId).eq('userId', trip.workspace.userId)
    )
    .unique();

  if (!favorite) {
    if (existing) await ctx.db.delete('tripPreferences', existing._id);
    return null;
  }

  const updatedAt = Date.now();
  if (existing) {
    await ctx.db.patch('tripPreferences', existing._id, { favorite: true, updatedAt });
    return null;
  }

  const preferences = await ctx.db
    .query('tripPreferences')
    .withIndex('by_organizationId_and_userId', (query) =>
      query.eq('organizationId', trip.workspace.organizationId).eq('userId', trip.workspace.userId)
    )
    .take(MAX_PREFERENCES_PER_USER + 1);
  if (preferences.length >= MAX_PREFERENCES_PER_USER) {
    throw new ConvexError(`Users can favourite up to ${MAX_PREFERENCES_PER_USER} trips`);
  }

  await ctx.db.insert('tripPreferences', {
    favorite: true,
    organizationId: trip.workspace.organizationId,
    tripId,
    updatedAt,
    userId: trip.workspace.userId
  });
  return null;
}

async function deleteForTrip(ctx: MutationCtx, tripId: Id<'trips'>, limit: number) {
  const rows = await ctx.db
    .query('tripPreferences')
    .withIndex('by_tripId_and_userId', (query) => query.eq('tripId', tripId))
    .take(limit);
  for (const row of rows) {
    await ctx.db.delete('tripPreferences', row._id);
  }
  return rows.length > 0;
}

/** Per-user trip favorites. */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class TripPreferences {
  static deleteForTrip = deleteForTrip;
  static favoriteTripIds = favoriteTripIds;
  static setFavorite = setFavorite;
}

export type TripPreference = Doc<'tripPreferences'>;
