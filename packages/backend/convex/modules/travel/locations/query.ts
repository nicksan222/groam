import { ConvexError } from 'convex/values';
import type { Id } from '#convex-generated/dataModel';
import type { QueryCtx } from '#convex-generated/server';
import { requireWorkspace, type Workspace } from '#convex/modules/auth/workspace';
import { TripLocations, type TripLocationType } from '#convex/modules/travel/locations/index';
import { validateCoordinates } from '#convex/modules/travel/trips/normalize';
import { findVisibleTrip } from '#convex/modules/travel/trips/visibility';

const MAX_LOCATION_RESULTS = 25;
const MAX_NEAREST_DISTANCE_METERS = 1_000_000;

function validateLimit(limit: number): void {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LOCATION_RESULTS) {
    throw new ConvexError(`Location result limit must be between 1 and ${MAX_LOCATION_RESULTS}`);
  }
}

function validatePoint(point: { latitude: number; longitude: number }): void {
  validateCoordinates(point, 'search point');
}

async function visibleLocations<T extends { key: string }>(
  ctx: QueryCtx,
  workspace: Workspace,
  results: T[]
): Promise<T[]> {
  const access = new Map<Id<'trips'>, Promise<boolean>>();
  const visible = await Promise.all(
    results.map(async (result) => {
      const location = await TripLocations.tripForKey(ctx, result.key);
      if (!location || location.organizationId !== workspace.organizationId) return false;
      let allowed = access.get(location.tripId);
      if (!allowed) {
        allowed = findVisibleTrip(ctx, location.tripId, workspace).then(Boolean);
        access.set(location.tripId, allowed);
      }
      return await allowed;
    })
  );
  return results.filter((_, index) => visible[index]);
}

/** Workspace-scoped geospatial lookups over trip locations. */
// oxlint-disable-next-line unicorn/no-static-only-class -- callers use this class, not loose functions
export class TripLocationQueries {
  static async nearest(
    ctx: QueryCtx,
    {
      point,
      type,
      limit,
      maxDistance
    }: {
      point: { latitude: number; longitude: number };
      type: TripLocationType;
      limit: number;
      maxDistance: number;
    }
  ) {
    const workspace = await requireWorkspace(ctx);
    validatePoint(point);
    validateLimit(limit);
    if (
      !Number.isFinite(maxDistance) ||
      maxDistance <= 0 ||
      maxDistance > MAX_NEAREST_DISTANCE_METERS
    ) {
      throw new ConvexError(
        `Maximum distance must be between 1 and ${MAX_NEAREST_DISTANCE_METERS} meters`
      );
    }
    const results = await TripLocations.nearest(ctx, {
      limit,
      maxDistance,
      organizationId: workspace.organizationId,
      point,
      type
    });
    return await visibleLocations(ctx, workspace, results);
  }

  static async region(
    ctx: QueryCtx,
    {
      rectangle,
      type,
      limit,
      cursor
    }: {
      rectangle: { east: number; north: number; south: number; west: number };
      type: TripLocationType;
      limit: number;
      cursor?: string;
    }
  ) {
    const workspace = await requireWorkspace(ctx);
    validatePoint({ latitude: rectangle.north, longitude: rectangle.east });
    validatePoint({ latitude: rectangle.south, longitude: rectangle.west });
    validateLimit(limit);
    if (rectangle.north <= rectangle.south || rectangle.east <= rectangle.west) {
      throw new ConvexError('Location rectangle bounds are invalid');
    }
    const page = await TripLocations.queryRegion(ctx, {
      cursor,
      limit,
      organizationId: workspace.organizationId,
      rectangle,
      type
    });
    return { ...page, results: await visibleLocations(ctx, workspace, page.results) };
  }
}
