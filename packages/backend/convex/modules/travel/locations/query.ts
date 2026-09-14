import { ConvexError } from 'convex/values';
import { requireWorkspace } from '#convex/modules/auth/workspace';
import { TripLocations, type TripLocationType } from '#convex/modules/travel/locations/index';
import { validateCoordinates } from '#convex/modules/travel/trips/normalize';
import type { QueryCtx } from '#convex-generated/server';

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

/** Workspace-scoped geospatial lookups over trip locations. */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class TripLocationQueries {
  static async nearest(
    ctx: QueryCtx,
    point: { latitude: number; longitude: number },
    type: TripLocationType,
    limit: number,
    maxDistance: number
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
    return await TripLocations.nearest(
      ctx,
      workspace.organizationId,
      point,
      type,
      limit,
      maxDistance
    );
  }

  static async region(
    ctx: QueryCtx,
    rectangle: { east: number; north: number; south: number; west: number },
    type: TripLocationType,
    limit: number,
    cursor?: string
  ) {
    const workspace = await requireWorkspace(ctx);
    validatePoint({ latitude: rectangle.north, longitude: rectangle.east });
    validatePoint({ latitude: rectangle.south, longitude: rectangle.west });
    validateLimit(limit);
    if (rectangle.north <= rectangle.south || rectangle.east <= rectangle.west) {
      throw new ConvexError('Location rectangle bounds are invalid');
    }
    return await TripLocations.queryRegion(
      ctx,
      workspace.organizationId,
      rectangle,
      type,
      limit,
      cursor
    );
  }
}
