import { ConvexError } from 'convex/values';
import type { Id } from '#convex-generated/dataModel';
import type { QueryCtx } from '#convex-generated/server';
import { requireWorkspace, type Workspace } from '#convex/modules/auth/workspace';
import { TripLocations, type TripLocationType } from '#convex/modules/travel/locations/index';
import { validateCoordinates } from '#convex/modules/travel/trips/normalize';
import { findVisibleTrip } from '#convex/modules/travel/trips/visibility';

const MAX_LOCATION_RESULTS = 25;
const MAX_NEAREST_CANDIDATES = 512;
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
  results: T[],
  checkedKeys = new Map<string, Promise<boolean>>()
): Promise<T[]> {
  const access = new Map<Id<'trips'>, Promise<boolean>>();
  const visible = await Promise.all(
    results.map((result) => {
      let checked = checkedKeys.get(result.key);
      if (checked) return checked;
      checked = (async () => {
        const location = await TripLocations.tripForKey(ctx, result.key);
        if (!location || location.organizationId !== workspace.organizationId) return false;
        let allowed = access.get(location.tripId);
        if (!allowed) {
          allowed = findVisibleTrip(ctx, location.tripId, workspace).then(Boolean);
          access.set(location.tripId, allowed);
        }
        return await allowed;
      })();
      checkedKeys.set(result.key, checked);
      return checked;
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
    const checkedKeys = new Map<string, Promise<boolean>>();
    let candidateLimit = limit;
    while (true) {
      const candidates = await TripLocations.nearest(ctx, {
        limit: candidateLimit,
        maxDistance,
        organizationId: workspace.organizationId,
        point,
        type
      });
      const visible = await visibleLocations(ctx, workspace, candidates, checkedKeys);
      if (visible.length >= limit || candidates.length < candidateLimit)
        return visible.slice(0, limit);
      // Keep the query bounded and fail explicitly instead of claiming no visible point exists.
      if (candidateLimit === MAX_NEAREST_CANDIDATES) {
        throw new ConvexError('Too many inaccessible map locations; narrow the search distance');
      }
      candidateLimit = Math.min(MAX_NEAREST_CANDIDATES, candidateLimit * 2);
    }
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
