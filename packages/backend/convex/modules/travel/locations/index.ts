import { GeospatialIndex, type Point } from '@convex-dev/geospatial';
import { components } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';

export type TripLocationType = 'activity' | 'destination' | 'trip';

type LocationFilters = {
  organizationId: string;
  tripId: Id<'trips'>;
  type: TripLocationType;
};

const index = new GeospatialIndex<string, LocationFilters>(components.geospatial);

function key(type: TripLocationType, id: string): string {
  return `${type}:${id}`;
}

/** Geospatial index for trip, destination, and activity points. */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class TripLocations {
  static activityKey(activityId: Id<'tripDestinationActivities'>): string {
    return key('activity', activityId);
  }

  static destinationKey(destinationId: Id<'tripDestinations'>): string {
    return key('destination', destinationId);
  }

  static async nearest(
    ctx: QueryCtx,
    organizationId: string,
    point: Point,
    type: TripLocationType,
    limit: number,
    maxDistance: number
  ) {
    return await index.nearest(ctx, {
      filter: (query) => query.eq('organizationId', organizationId).eq('type', type),
      limit,
      maxDistance,
      point
    });
  }

  static async queryRegion(
    ctx: QueryCtx,
    organizationId: string,
    rectangle: { east: number; north: number; south: number; west: number },
    type: TripLocationType,
    limit: number,
    cursor?: string
  ) {
    return await index.query(
      ctx,
      {
        filter: (query) => query.eq('organizationId', organizationId).eq('type', type),
        limit,
        shape: { rectangle, type: 'rectangle' }
      },
      cursor
    );
  }

  static async removeActivity(ctx: MutationCtx, activityId: Id<'tripDestinationActivities'>) {
    await index.remove(ctx, TripLocations.activityKey(activityId));
  }

  static async removeDestination(ctx: MutationCtx, destinationId: Id<'tripDestinations'>) {
    await index.remove(ctx, TripLocations.destinationKey(destinationId));
  }

  static async removeTrip(ctx: MutationCtx, tripId: Id<'trips'>) {
    await index.remove(ctx, key('trip', tripId));
  }

  static async setActivity(
    ctx: MutationCtx,
    activityId: Id<'tripDestinationActivities'>,
    tripId: Id<'trips'>,
    organizationId: string,
    coordinates: Point | undefined
  ) {
    const pointKey = TripLocations.activityKey(activityId);
    if (!coordinates) {
      await index.remove(ctx, pointKey);
      return;
    }
    await index.insert(ctx, pointKey, coordinates, {
      organizationId,
      tripId,
      type: 'activity'
    });
  }

  static async setDestination(
    ctx: MutationCtx,
    destinationId: Id<'tripDestinations'>,
    tripId: Id<'trips'>,
    organizationId: string,
    coordinates: Point
  ) {
    await index.insert(ctx, TripLocations.destinationKey(destinationId), coordinates, {
      organizationId,
      tripId,
      type: 'destination'
    });
  }

  static async setTrip(
    ctx: MutationCtx,
    tripId: Id<'trips'>,
    organizationId: string,
    coordinates: Point | undefined
  ) {
    const pointKey = key('trip', tripId);
    if (!coordinates) {
      await index.remove(ctx, pointKey);
      return;
    }
    await index.insert(ctx, pointKey, coordinates, {
      organizationId,
      tripId,
      type: 'trip'
    });
  }

  static tripKey(tripId: Id<'trips'>): string {
    return key('trip', tripId);
  }
}
