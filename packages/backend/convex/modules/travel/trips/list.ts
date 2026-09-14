import type { PaginationOptions } from 'convex/server';
import { ConvexError } from 'convex/values';
import { requireWorkspace } from '#convex/modules/auth/workspace';
import { TripPreferences } from '#convex/modules/travel/preferences/index';
import { projectTripListItem } from '#convex/modules/travel/trips/projection';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { QueryCtx } from '#convex-generated/server';

const MAX_TRIP_PAGE_SIZE = 25;

function isSidebarListableTrip(
  data: Doc<'trips'>,
  organizationId: string,
  includeArchived: boolean
) {
  return (
    data.organizationId === organizationId &&
    data.proposal?.sourceTripId === undefined &&
    (includeArchived || data.archive === undefined)
  );
}

function buildTripListQuery(
  ctx: QueryCtx,
  organizationId: string,
  includeArchived: boolean,
  excludeTripIds: Iterable<Id<'trips'>>
) {
  let tripsQuery = ctx.db
    .query('trips')
    .withIndex('by_organizationId_and_proposal_sourceTripId_and_updatedAt', (query) =>
      query.eq('organizationId', organizationId).eq('proposal.sourceTripId', undefined)
    )
    .order('desc');
  if (!includeArchived) {
    tripsQuery = tripsQuery.filter((query) => query.eq(query.field('archive'), undefined));
  }
  for (const tripId of excludeTripIds) {
    tripsQuery = tripsQuery.filter((query) => query.neq(query.field('_id'), tripId));
  }
  return tripsQuery;
}

async function listFavoriteTrips(
  ctx: QueryCtx,
  organizationId: string,
  includeArchived: boolean,
  favoriteIds: Set<Id<'trips'>>
) {
  const favoriteDocs = await Promise.all(
    [...favoriteIds].map((tripId) => ctx.db.get('trips', tripId))
  );
  const favorites = await Promise.all(
    favoriteDocs.flatMap((data) =>
      data && isSidebarListableTrip(data, organizationId, includeArchived)
        ? [projectTripListItem(ctx, data, favoriteIds)]
        : []
    )
  );
  favorites.sort((left, right) => right.lastUpdatedAt - left.lastUpdatedAt);
  return favorites;
}

export async function listTrips(
  ctx: QueryCtx,
  paginationOpts: PaginationOptions,
  options: { includeArchived?: boolean } = {}
) {
  const workspace = await requireWorkspace(ctx);
  if (
    !Number.isInteger(paginationOpts.numItems) ||
    paginationOpts.numItems < 1 ||
    paginationOpts.numItems > MAX_TRIP_PAGE_SIZE
  ) {
    throw new ConvexError(`trip page size must be between 1 and ${MAX_TRIP_PAGE_SIZE}`);
  }

  const includeArchived = options.includeArchived !== false;
  const favoriteIds = await TripPreferences.favoriteTripIds(
    ctx,
    workspace.organizationId,
    workspace.userId
  );
  const isFirstPage = paginationOpts.cursor === null || paginationOpts.cursor === '';
  const favorites =
    isFirstPage && favoriteIds.size > 0
      ? await listFavoriteTrips(ctx, workspace.organizationId, includeArchived, favoriteIds)
      : [];

  // One `.paginate()` only — Convex rejects multiple paginate calls per query.
  const tripsQuery = buildTripListQuery(
    ctx,
    workspace.organizationId,
    includeArchived,
    favoriteIds
  );
  const {
    continueCursor,
    isDone,
    page: pageDocs
  } = await tripsQuery.paginate(
    isFirstPage ? { cursor: null, numItems: paginationOpts.numItems } : paginationOpts
  );

  const page = [
    ...favorites,
    ...(await Promise.all(pageDocs.map((data) => projectTripListItem(ctx, data, favoriteIds))))
  ];

  return { continueCursor, isDone, page };
}
