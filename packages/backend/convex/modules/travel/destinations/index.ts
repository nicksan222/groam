import { ConvexError, type Infer } from 'convex/values';
import { Attachments } from '#convex/modules/media/attachments/index';
import { ItineraryActivity } from '#convex/modules/travel/activities/index';
import { DestinationCover } from '#convex/modules/travel/covers/destination/index';
import { TripCover } from '#convex/modules/travel/covers/index';
import type { TripDestinationValidators } from '#convex/modules/travel/destinations/schema';
import { TripLocations } from '#convex/modules/travel/locations/index';
import { TripStay } from '#convex/modules/travel/stays/index';
import { type TripBoundary, TripTransfer } from '#convex/modules/travel/transfers/index';
import {
  assertDayWithinTrip,
  assertMutable,
  type DestinationMutationCtx,
  loadTripContext,
  type MutableTripCtx,
  patchTrip,
  recordActivity,
  totalDays
} from '#convex/modules/travel/trips/ctx';
import { normalizeKnownDestination } from '#convex/modules/travel/trips/normalize';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';

const MAX_DAY_NOTES_LENGTH = 240;
const MAX_EXTRA_DAYS = 14;

export async function ensureTripCoversDay(trip: MutableTripCtx, day: number): Promise<void> {
  const current = totalDays(trip);
  if (current !== undefined && current >= day) return;
  await patchTrip(trip, {
    duration: { ...trip.trip.duration, totalDays: day },
    updatedAt: Date.now()
  });
  await recordActivity(
    trip,
    'details_updated',
    `${trip.workspace.viewerName} updated trip details`
  );
}

export type TripDestinationStopInput = Infer<typeof TripDestinationValidators.stopInput>;

type Schedule = { endDay: number; startDay: number };

function changedRouteBoundaries(
  previous: Doc<'tripDestinations'>[],
  next: Doc<'tripDestinations'>[]
): TripBoundary[] {
  const boundaries: TripBoundary[] = [];
  if (previous[0]?._id !== next[0]?._id) boundaries.push('arrival');
  if (previous[previous.length - 1]?._id !== next[next.length - 1]?._id) {
    boundaries.push('departure');
  }
  return boundaries;
}

export class TripDestination {
  static readonly MAX_PER_TRIP = 20;

  private constructor(
    private readonly ctx: MutationCtx,
    private readonly trip: MutableTripCtx,
    readonly data: Doc<'tripDestinations'>
  ) {}

  static fromCtx(ctx: DestinationMutationCtx): TripDestination {
    return new TripDestination(ctx, ctx, ctx.destination);
  }

  static async find(
    ctx: MutationCtx,
    tripId: Id<'trips'>,
    destinationId: Id<'tripDestinations'>
  ): Promise<TripDestination> {
    const [trip, destination] = await Promise.all([
      loadTripContext(ctx, tripId),
      ctx.db.get('tripDestinations', destinationId)
    ]);
    if (!destination || destination.tripId !== tripId) {
      throw new ConvexError('Trip destination not found');
    }
    return new TripDestination(ctx, trip, destination);
  }

  static async add(
    ctx: MutableTripCtx,
    input: TripDestinationStopInput
  ): Promise<Id<'tripDestinations'>> {
    const tripId = ctx.trip._id;
    const destination = TripDestination.normalize(input);
    assertDayWithinTrip(ctx, destination.schedule?.endDay, 'Destination schedule');
    const destinations = await TripDestination.forTrip(ctx, tripId);
    if (destinations.length >= TripDestination.MAX_PER_TRIP) {
      throw new ConvexError(`Trips support up to ${TripDestination.MAX_PER_TRIP} destinations`);
    }
    TripDestination.assertChronological([...destinations, destination]);
    const duplicate = await ctx.db
      .query('tripDestinations')
      .withIndex('by_tripId_and_placeId', (query) =>
        query.eq('tripId', tripId).eq('placeId', destination.placeId)
      )
      .unique();
    if (duplicate) throw new ConvexError('That destination is already on this trip');
    if (destinations.length > 0) {
      await TripTransfer.deleteBoundaries(ctx, tripId, ['departure']);
    }

    const cover = TripCover.from(ctx, ctx);
    const coverRefresh = destinations.length === 0 ? cover.refresh(true) : null;
    const destinationId = await ctx.db.insert('tripDestinations', {
      coordinates: destination.coordinates,
      countryCode: destination.countryCode,
      cover: DestinationCover.initial(),
      dayNotes: destination.dayNotes,
      name: destination.name,
      placeId: destination.placeId,
      position: destinations.length,
      schedule: destination.schedule,
      tripId
    });
    await TripLocations.setDestination(ctx, {
      coordinates: destination.coordinates,
      destinationId,
      organizationId: ctx.workspace.organizationId,
      tripId
    });
    await patchTrip(ctx, {
      ...(coverRefresh ? { cover: coverRefresh.cover } : {}),
      ...(destinations.length === 0
        ? { destination: TripDestination.summaryFromInput(destination) }
        : {}),
      updatedAt: Date.now()
    });
    if (destinations.length === 0) {
      await TripLocations.setTrip(ctx, {
        coordinates: destination.coordinates,
        organizationId: ctx.workspace.organizationId,
        tripId: ctx.trip._id
      });
    }
    await recordActivity(
      ctx,
      'destination_added',
      `${ctx.workspace.viewerName} added ${destination.name} to the trip`
    );
    if (coverRefresh) await cover.schedule(coverRefresh.generation);
    await DestinationCover.schedule(ctx, destinationId, 1);
    return destinationId;
  }

  async update(
    dayNotes: string | undefined,
    startDay: number | undefined,
    endDay: number | undefined
  ): Promise<null> {
    assertMutable(this.trip);
    const normalized = TripDestination.normalizeSchedule(dayNotes, startDay, endDay);
    assertDayWithinTrip(this.trip, normalized.schedule?.endDay, 'Destination schedule');
    if (
      this.data.dayNotes === normalized.dayNotes &&
      this.data.schedule?.startDay === normalized.schedule?.startDay &&
      this.data.schedule?.endDay === normalized.schedule?.endDay
    ) {
      return null;
    }
    const [activities, stays, destinations] = await Promise.all([
      ItineraryActivity.forDestination(this.ctx, this.data._id),
      TripStay.forDestination(this.ctx, this.data._id),
      TripDestination.forTrip(this.ctx, this.trip.trip._id)
    ]);
    const schedule = normalized.schedule;
    const scheduleChanged =
      this.data.schedule?.startDay !== schedule?.startDay ||
      this.data.schedule?.endDay !== schedule?.endDay;
    if (
      schedule &&
      activities.some(
        (activity) =>
          activity.schedule.day < schedule.startDay ||
          (activity.schedule.endDay ?? activity.schedule.day) > schedule.endDay
      )
    ) {
      throw new ConvexError('destination schedule must include every existing activity day');
    }
    if (
      schedule &&
      stays.some(
        (stay) =>
          stay.schedule.checkInDay < schedule.startDay ||
          stay.schedule.checkOutDay > schedule.endDay
      )
    ) {
      throw new ConvexError('destination schedule must include every existing stay day');
    }
    TripDestination.assertChronological(
      destinations.map((destination) =>
        destination._id === this.data._id ? { ...destination, ...normalized } : destination
      )
    );
    if (scheduleChanged) {
      await TripTransfer.assertDestinationScheduleChange({
        ctx: this.ctx,
        destination: this.data,
        destinations,
        schedule: normalized.schedule,
        trip: this.trip
      });
    }

    await patchTrip(this.trip, { updatedAt: Date.now() });
    await this.ctx.db.patch('tripDestinations', this.data._id, normalized);
    await recordActivity(
      this.trip,
      'destination_updated',
      `${this.trip.workspace.viewerName} updated the plan for ${this.data.name}`
    );
    return null;
  }

  async extendByDays(extraDays: number): Promise<{
    endDay: number;
    extraDays: number;
    startDay: number;
    totalDurationDays: number;
  }> {
    if (!Number.isInteger(extraDays) || extraDays < 1 || extraDays > MAX_EXTRA_DAYS) {
      throw new ConvexError(`extra days must be between 1 and ${MAX_EXTRA_DAYS}`);
    }
    const schedule = this.data.schedule;
    if (!schedule) throw new ConvexError('This stop has no day range to extend');
    const endDay = schedule.endDay + extraDays;
    await ensureTripCoversDay(this.trip, endDay);
    await this.update(this.data.dayNotes, schedule.startDay, endDay);
    return {
      endDay,
      extraDays,
      startDay: schedule.startDay,
      totalDurationDays: totalDays(this.trip) ?? endDay
    };
  }

  async setSchedule(
    startDay: number,
    endDay: number,
    dayNotes?: string
  ): Promise<{ endDay: number; startDay: number; totalDurationDays: number }> {
    await ensureTripCoversDay(this.trip, endDay);
    await this.update(dayNotes ?? this.data.dayNotes, startDay, endDay);
    return {
      endDay,
      startDay,
      totalDurationDays: totalDays(this.trip) ?? endDay
    };
  }

  private static swappedSchedule(
    first: Doc<'tripDestinations'>,
    second: Doc<'tripDestinations'>
  ): Map<Id<'tripDestinations'>, Schedule> {
    const updates = new Map<Id<'tripDestinations'>, Schedule>();
    if (!first.schedule || !second.schedule) return updates;

    const gap = second.schedule.startDay - first.schedule.endDay;
    if (gap < 0) return updates;
    const secondDuration = second.schedule.endDay - second.schedule.startDay + 1;
    const firstDuration = first.schedule.endDay - first.schedule.startDay + 1;
    const newSecondStart = first.schedule.startDay;
    const newSecondEnd = newSecondStart + secondDuration - 1;
    const newFirstStart = newSecondEnd + gap;
    updates.set(second._id, { endDay: newSecondEnd, startDay: newSecondStart });
    updates.set(first._id, {
      endDay: newFirstStart + firstDuration - 1,
      startDay: newFirstStart
    });
    return updates;
  }

  private async shiftedActivities(
    destinations: Doc<'tripDestinations'>[],
    scheduleUpdates: Map<Id<'tripDestinations'>, Schedule>
  ) {
    return await Promise.all(
      [...scheduleUpdates].map(async ([destinationId, schedule]) => {
        const destination = destinations.find((item) => item._id === destinationId);
        if (!destination?.schedule) return [];
        const dayShift = schedule.startDay - destination.schedule.startDay;
        const activities = await ItineraryActivity.forDestination(this.ctx, destinationId);
        return activities.map((activity) => ({
          activityId: activity._id,
          schedule: {
            ...activity.schedule,
            day: activity.schedule.day + dayShift,
            ...(activity.schedule.endDay === undefined
              ? {}
              : { endDay: activity.schedule.endDay + dayShift })
          }
        }));
      })
    );
  }

  async move(direction: 'earlier' | 'later'): Promise<null> {
    assertMutable(this.trip);
    const destinations = await TripDestination.forTrip(this.ctx, this.trip.trip._id);
    const currentIndex = destinations.findIndex((destination) => destination._id === this.data._id);
    const targetIndex = direction === 'earlier' ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= destinations.length) return null;

    const current = destinations[currentIndex];
    const target = destinations[targetIndex];
    if (!current || !target) return null;
    const firstIndex = Math.min(currentIndex, targetIndex);
    const first = destinations[firstIndex];
    const second = destinations[firstIndex + 1];
    if (!first || !second) return null;

    const scheduleUpdates = TripDestination.swappedSchedule(first, second);
    const ordered = [...destinations];
    ordered[currentIndex] = target;
    ordered[targetIndex] = current;
    TripDestination.assertChronological(
      ordered.map((destination) => ({
        ...destination,
        ...(scheduleUpdates.has(destination._id)
          ? { schedule: scheduleUpdates.get(destination._id) }
          : {})
      }))
    );
    const activitiesByDestination = await this.shiftedActivities(destinations, scheduleUpdates);

    await Promise.all([
      this.ctx.db.patch('tripDestinations', current._id, {
        position: targetIndex,
        ...(scheduleUpdates.has(current._id) ? { schedule: scheduleUpdates.get(current._id) } : {})
      }),
      this.ctx.db.patch('tripDestinations', target._id, {
        position: currentIndex,
        ...(scheduleUpdates.has(target._id) ? { schedule: scheduleUpdates.get(target._id) } : {})
      })
    ]);
    await Promise.all(
      activitiesByDestination
        .flat()
        .map(({ activityId, schedule }) =>
          this.ctx.db.patch('tripDestinationActivities', activityId, { schedule })
        )
    );
    await Promise.all(
      [...scheduleUpdates].flatMap(([destinationId, schedule]) => {
        const previous = destinations.find((item) => item._id === destinationId)?.schedule;
        if (!previous) return [];
        const dayShift = schedule.startDay - previous.startDay;
        return [
          TripStay.shiftForDestination(this.ctx, destinationId, dayShift),
          TripTransfer.shiftActivityTimingsForDestination(this.ctx, destinationId, dayShift)
        ];
      })
    );
    await TripTransfer.deleteInvalidDestinationConnections(
      this.ctx,
      this.trip.trip._id,
      ordered.map((destination) => destination._id)
    );
    await TripTransfer.deleteBoundaries(
      this.ctx,
      this.trip.trip._id,
      changedRouteBoundaries(destinations, ordered)
    );

    const primaryDestination = ordered[0];
    if (!primaryDestination) return null;
    const primaryChanged = destinations[0]?._id !== primaryDestination._id;
    const cover = TripCover.from(this.ctx, this.trip);
    const coverRefresh = primaryChanged ? cover.refresh(true) : null;
    await patchTrip(this.trip, {
      ...(coverRefresh ? { cover: coverRefresh.cover } : {}),
      destination: TripDestination.summary(primaryDestination),
      updatedAt: Date.now()
    });
    if (primaryChanged) {
      await TripLocations.setTrip(this.ctx, {
        coordinates: primaryDestination.coordinates,
        organizationId: this.trip.workspace.organizationId,
        tripId: this.trip.trip._id
      });
    }
    if (coverRefresh) {
      await cover.schedule(coverRefresh.generation);
    }
    await recordActivity(
      this.trip,
      'destination_updated',
      `${this.trip.workspace.viewerName} moved ${current.name} ${direction === 'earlier' ? 'before' : 'after'} ${target.name}`
    );
    return null;
  }

  async delete(): Promise<null> {
    assertMutable(this.trip);
    const [destinations, activities] = await Promise.all([
      TripDestination.forTrip(this.ctx, this.trip.trip._id),
      ItineraryActivity.forDestination(this.ctx, this.data._id)
    ]);
    const remaining = destinations.filter((item) => item._id !== this.data._id);
    const cover = TripCover.from(this.ctx, this.trip);
    const removesPrimaryDestination = destinations[0]?._id === this.data._id;
    const removesFinalDestination = destinations[destinations.length - 1]?._id === this.data._id;
    const coverChange = removesPrimaryDestination
      ? remaining.length > 0
        ? cover.refresh(true)
        : cover.clearAutomatic()
      : null;
    const changedBoundaries: TripBoundary[] = [];
    if (removesPrimaryDestination) changedBoundaries.push('arrival');
    if (removesFinalDestination) changedBoundaries.push('departure');
    await TripTransfer.deleteBoundaries(this.ctx, this.trip.trip._id, changedBoundaries);
    await TripTransfer.deleteForDestination(this.ctx, this.trip.trip._id, this.data._id);
    await TripStay.deleteForDestination(this.ctx, this.data._id);
    await Promise.all(
      activities.map((activity) => ItineraryActivity.deleteOwned(this.ctx, activity, true))
    );
    await Attachments.removeTarget(this.ctx, this.trip.trip._id, {
      id: this.data._id,
      type: 'destination'
    });
    await TripLocations.removeDestination(this.ctx, this.data._id);
    await DestinationCover.deleteStorage(this.ctx, this.data);
    await this.ctx.db.delete('tripDestinations', this.data._id);
    await Promise.all(
      remaining.map((item, position) =>
        item.position === position
          ? null
          : this.ctx.db.patch('tripDestinations', item._id, { position })
      )
    );
    await patchTrip(this.trip, {
      ...(coverChange ? { cover: coverChange.cover } : {}),
      destination: remaining[0] ? TripDestination.summary(remaining[0]) : { status: 'undecided' },
      updatedAt: Date.now()
    });
    await TripLocations.setTrip(this.ctx, {
      coordinates: remaining[0]?.coordinates,
      organizationId: this.trip.workspace.organizationId,
      tripId: this.trip.trip._id
    });
    await recordActivity(
      this.trip,
      'destination_removed',
      `${this.trip.workspace.viewerName} removed ${this.data.name} from the trip`
    );
    if (coverChange && remaining.length > 0) await cover.schedule(coverChange.generation);
    return null;
  }

  private static assertChronological(
    destinations: Array<{ name: string; schedule?: Schedule }>
  ): void {
    let previous: { endDay: number; name: string } | null = null;
    for (const destination of destinations) {
      if (!destination.schedule) continue;
      if (previous && destination.schedule.startDay < previous.endDay) {
        throw new ConvexError(
          `${destination.name} cannot start before day ${previous.endDay} because it follows ${previous.name}. Same-day handoffs are allowed.`
        );
      }
      previous = { endDay: destination.schedule.endDay, name: destination.name };
    }
  }

  static normalizeSchedule(
    dayNotes: string | undefined,
    startDay: number | undefined,
    endDay: number | undefined
  ) {
    const normalizedNotes = dayNotes?.trim();
    if (normalizedNotes && normalizedNotes.length > MAX_DAY_NOTES_LENGTH) {
      throw new ConvexError(
        `destination notes must be ${MAX_DAY_NOTES_LENGTH} characters or fewer`
      );
    }
    if ((startDay === undefined) !== (endDay === undefined)) {
      throw new ConvexError('destination schedule must include a start day and end day');
    }
    if (startDay !== undefined && (!Number.isInteger(startDay) || startDay < 1 || startDay > 365)) {
      throw new ConvexError('destination start day must be between 1 and 365');
    }
    if (endDay !== undefined && (!Number.isInteger(endDay) || endDay < 1 || endDay > 365)) {
      throw new ConvexError('destination end day must be between 1 and 365');
    }
    if (startDay !== undefined && endDay !== undefined && endDay < startDay) {
      throw new ConvexError('destination end day cannot be before its start day');
    }
    return {
      dayNotes: normalizedNotes || undefined,
      schedule: startDay === undefined || endDay === undefined ? undefined : { endDay, startDay }
    };
  }

  static normalize(input: TripDestinationStopInput) {
    const destination = normalizeKnownDestination(input);
    if (!('coordinates' in destination)) {
      throw new ConvexError('Choose a verified place from location search');
    }
    return {
      ...destination,
      ...TripDestination.normalizeSchedule(
        input.dayNotes,
        input.schedule?.startDay,
        input.schedule?.endDay
      )
    };
  }

  static async forTrip(
    ctx: MutationCtx | QueryCtx,
    tripId: Id<'trips'>
  ): Promise<Doc<'tripDestinations'>[]> {
    const destinations = await ctx.db
      .query('tripDestinations')
      .withIndex('by_tripId_and_position', (query) => query.eq('tripId', tripId))
      .take(TripDestination.MAX_PER_TRIP + 1);
    if (destinations.length > TripDestination.MAX_PER_TRIP) {
      throw new ConvexError(`Trips support up to ${TripDestination.MAX_PER_TRIP} destinations`);
    }
    return destinations;
  }

  static summary(destination: Doc<'tripDestinations'>) {
    return {
      coordinates: destination.coordinates,
      ...(destination.countryCode ? { countryCode: destination.countryCode } : {}),
      name: destination.name,
      placeId: destination.placeId,
      status: 'known' as const
    };
  }

  private static summaryFromInput(destination: ReturnType<typeof TripDestination.normalize>) {
    return {
      coordinates: destination.coordinates,
      ...(destination.countryCode ? { countryCode: destination.countryCode } : {}),
      name: destination.name,
      placeId: destination.placeId,
      status: 'known' as const
    };
  }
}
