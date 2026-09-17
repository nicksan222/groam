import { ConvexError, type Infer } from 'convex/values';
import { Attachments } from '#convex/modules/media/attachments/index';
import type { TripActivityValidators } from '#convex/modules/travel/activities/schema';
import { TripLocations } from '#convex/modules/travel/locations/index';
import { TripTransfer } from '#convex/modules/travel/transfers/index';
import { costsMatch } from '#convex/modules/travel/trips/costs';
import {
  assertDayWithinTrip,
  assertMutable,
  loadTripContext,
  type MutableTripCtx,
  patchTrip,
  recordActivity
} from '#convex/modules/travel/trips/ctx';
import { LocalDateTime } from '#convex/modules/travel/trips/datetime';
import { normalizeCostRecord, validateCoordinates } from '#convex/modules/travel/trips/normalize';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';

const MAX_ACTIVITY_ADDRESS_LENGTH = 240;
const MAX_ACTIVITY_NOTES_LENGTH = 240;
const MAX_ACTIVITY_TITLE_LENGTH = 100;

export type ItineraryActivityInput = Infer<typeof TripActivityValidators.input>;

export class ItineraryActivity {
  static readonly MAX_PER_TRIP = 200;
  static readonly MAX_PER_DESTINATION = 30;
  static readonly MAX_ATTACHMENTS = 5;

  private constructor(
    private readonly ctx: MutationCtx,
    private readonly trip: MutableTripCtx,
    readonly data: Doc<'tripDestinationActivities'>,
    readonly destination: Doc<'tripDestinations'>
  ) {}

  static async find(
    ctx: MutationCtx,
    tripId: Id<'trips'>,
    activityId: Id<'tripDestinationActivities'>
  ): Promise<ItineraryActivity> {
    const [trip, activity] = await Promise.all([
      loadTripContext(ctx, tripId),
      ctx.db.get('tripDestinationActivities', activityId)
    ]);
    if (!activity || activity.tripId !== tripId) {
      throw new ConvexError('Itinerary activity not found');
    }
    const destination = await ctx.db.get('tripDestinations', activity.destinationId);
    if (!destination || destination.tripId !== tripId) {
      throw new ConvexError('Trip destination not found');
    }
    return new ItineraryActivity(ctx, trip, activity, destination);
  }

  static async add(
    ctx: MutationCtx,
    tripId: Id<'trips'>,
    destinationId: Id<'tripDestinations'>,
    input: ItineraryActivityInput
  ): Promise<Id<'tripDestinationActivities'>> {
    const trip = await loadTripContext(ctx, tripId);
    assertMutable(trip);
    const destination = await ctx.db.get('tripDestinations', destinationId);
    if (!destination || destination.tripId !== tripId) {
      throw new ConvexError('Trip destination not found');
    }
    const normalized = ItineraryActivity.normalize(input, destination);
    assertDayWithinTrip(trip, normalized.schedule.day, 'Activity day');
    assertDayWithinTrip(
      trip,
      normalized.schedule.endDay ?? normalized.schedule.day,
      'Activity end day'
    );
    const [activities, itineraryActivities] = await Promise.all([
      ItineraryActivity.forDestination(ctx, destinationId),
      ItineraryActivity.forTrip(ctx, tripId)
    ]);
    if (activities.length >= ItineraryActivity.MAX_PER_DESTINATION) {
      throw new ConvexError(
        `Destinations support up to ${ItineraryActivity.MAX_PER_DESTINATION} activities`
      );
    }
    if (itineraryActivities.length >= ItineraryActivity.MAX_PER_TRIP) {
      throw new ConvexError(
        `Trips support up to ${ItineraryActivity.MAX_PER_TRIP} itinerary activities`
      );
    }
    const activityId = await ctx.db.insert('tripDestinationActivities', {
      ...normalized,
      destinationId,
      position: activities.length,
      tripId
    });
    await Attachments.setTarget(ctx, {
      label: 'Activities',
      maximum: ItineraryActivity.MAX_ATTACHMENTS,
      mediaIds: input.attachmentIds,
      organizationId: trip.workspace.organizationId,
      target: { id: activityId, type: 'activity' },
      tripId
    });
    await TripLocations.setActivity(ctx, {
      activityId,
      coordinates: normalized.coordinates,
      organizationId: trip.workspace.organizationId,
      tripId
    });
    await patchTrip(trip, { updatedAt: Date.now() });
    await recordActivity(
      trip,
      'itinerary_activity_added',
      `${trip.workspace.viewerName} added ${normalized.title} in ${destination.name}`
    );
    return activityId;
  }

  static async reorderByDay(
    ctx: MutationCtx,
    tripId: Id<'trips'>,
    destinationId: Id<'tripDestinations'>
  ): Promise<null> {
    const [trip, destination, activities] = await Promise.all([
      loadTripContext(ctx, tripId),
      ctx.db.get('tripDestinations', destinationId),
      ItineraryActivity.forDestination(ctx, destinationId)
    ]);
    assertMutable(trip);
    if (!destination || destination.tripId !== tripId) {
      throw new ConvexError('Trip destination not found');
    }
    const ordered = activities
      .slice()
      .sort(
        (left, right) => left.schedule.day - right.schedule.day || left.position - right.position
      );
    if (ordered.every((activity, position) => activity.position === position)) return null;

    await Promise.all(
      ordered.map((activity, position) =>
        activity.position === position
          ? null
          : ctx.db.patch('tripDestinationActivities', activity._id, { position })
      )
    );
    await TripTransfer.deleteInvalidActivityConnections(
      ctx,
      destinationId,
      ordered.map((activity) => activity._id)
    );
    await patchTrip(trip, { updatedAt: Date.now() });
    await recordActivity(
      trip,
      'itinerary_activity_updated',
      `${trip.workspace.viewerName} reordered activities in ${destination.name} by day`
    );
    return null;
  }

  private scheduleMatches(normalized: ReturnType<typeof ItineraryActivity.normalize>): boolean {
    return [
      this.data.schedule.day === normalized.schedule.day,
      (this.data.schedule.endDay ?? this.data.schedule.day) ===
        (normalized.schedule.endDay ?? normalized.schedule.day),
      this.data.schedule.startTime === normalized.schedule.startTime,
      this.data.schedule.endTime === normalized.schedule.endTime,
      this.data.schedule.timeBlock === normalized.schedule.timeBlock
    ].every(Boolean);
  }

  private detailsMatch(
    normalized: ReturnType<typeof ItineraryActivity.normalize>,
    scheduleMatches: boolean
  ): boolean {
    return [
      this.data.address === normalized.address,
      this.data.coordinates?.latitude === normalized.coordinates?.latitude,
      this.data.coordinates?.longitude === normalized.coordinates?.longitude,
      costsMatch(this.data.cost, normalized.cost),
      this.data.notes === normalized.notes,
      scheduleMatches,
      this.data.title === normalized.title
    ].every(Boolean);
  }

  async update(input: ItineraryActivityInput): Promise<null> {
    assertMutable(this.trip);
    const normalized = ItineraryActivity.normalize(input, this.destination);
    assertDayWithinTrip(this.trip, normalized.schedule.day, 'Activity day');
    assertDayWithinTrip(
      this.trip,
      normalized.schedule.endDay ?? normalized.schedule.day,
      'Activity end day'
    );
    const scheduleMatches = this.scheduleMatches(normalized);
    if (!scheduleMatches) {
      await TripTransfer.assertActivityScheduleChange(
        this.ctx,
        this.trip.trip._id,
        this.data,
        normalized.schedule
      );
    }
    const attachmentsChanged = await Attachments.setTarget(this.ctx, {
      label: 'Activities',
      maximum: ItineraryActivity.MAX_ATTACHMENTS,
      mediaIds: input.attachmentIds,
      organizationId: this.trip.workspace.organizationId,
      target: { id: this.data._id, type: 'activity' },
      tripId: this.trip.trip._id
    });
    const detailsMatch = this.detailsMatch(normalized, scheduleMatches);
    if (detailsMatch && !attachmentsChanged) return null;

    await patchTrip(this.trip, { updatedAt: Date.now() });
    if (!detailsMatch) {
      await this.ctx.db.patch('tripDestinationActivities', this.data._id, normalized);
      await TripLocations.setActivity(this.ctx, {
        activityId: this.data._id,
        coordinates: normalized.coordinates,
        organizationId: this.trip.workspace.organizationId,
        tripId: this.trip.trip._id
      });
    }
    await recordActivity(
      this.trip,
      'itinerary_activity_updated',
      `${this.trip.workspace.viewerName} updated ${normalized.title} in ${this.destination.name}`
    );
    return null;
  }

  static async deleteOwned(
    ctx: MutationCtx,
    activity: Doc<'tripDestinationActivities'>,
    transfersAlreadyDeleted = false
  ): Promise<void> {
    if (!transfersAlreadyDeleted) {
      await TripTransfer.deleteForActivity(ctx, activity.tripId, activity._id);
    }
    await Attachments.removeTarget(ctx, activity.tripId, {
      id: activity._id,
      type: 'activity'
    });
    await TripLocations.removeActivity(ctx, activity._id);
    await ctx.db.delete('tripDestinationActivities', activity._id);
  }

  async delete(): Promise<null> {
    assertMutable(this.trip);
    const activities = await ItineraryActivity.forDestination(this.ctx, this.destination._id);
    const remaining = activities.filter((item) => item._id !== this.data._id);
    await ItineraryActivity.deleteOwned(this.ctx, this.data);
    await Promise.all(
      remaining.map((item, position) =>
        item.position === position
          ? null
          : this.ctx.db.patch('tripDestinationActivities', item._id, { position })
      )
    );
    await patchTrip(this.trip, { updatedAt: Date.now() });
    await recordActivity(
      this.trip,
      'itinerary_activity_removed',
      `${this.trip.workspace.viewerName} removed ${this.data.title} from ${this.destination.name}`
    );
    return null;
  }

  static validateDays(day: number, endDay: number, destination: Doc<'tripDestinations'>): void {
    if (!Number.isInteger(day) || day < 1 || day > 365) {
      throw new ConvexError('activity day must be a whole number between 1 and 365');
    }
    if (!Number.isInteger(endDay) || endDay < 1 || endDay > 365) {
      throw new ConvexError('activity end day must be a whole number between 1 and 365');
    }
    if (endDay < day) throw new ConvexError('activity end day cannot be before its start day');
    if (
      destination.schedule &&
      (day < destination.schedule.startDay || endDay > destination.schedule.endDay)
    ) {
      throw new ConvexError('activity days must fall within the destination day range');
    }
  }

  static optionalText(
    value: string | undefined,
    label: string,
    maximum: number
  ): string | undefined {
    const normalized = value?.trim();
    if (normalized && normalized.length > maximum) {
      throw new ConvexError(`${label} must be ${maximum} characters or fewer`);
    }
    return normalized || undefined;
  }

  static normalize(input: ItineraryActivityInput, destination: Doc<'tripDestinations'>) {
    const { day } = input.schedule;
    const endDay = input.schedule.endDay ?? day;
    ItineraryActivity.validateDays(day, endDay, destination);
    const address = ItineraryActivity.optionalText(
      input.address,
      'activity address',
      MAX_ACTIVITY_ADDRESS_LENGTH
    );
    const cost = normalizeCostRecord(input.cost, 'activity cost');
    const notes = ItineraryActivity.optionalText(
      input.notes,
      'activity notes',
      MAX_ACTIVITY_NOTES_LENGTH
    );
    if (input.coordinates) validateCoordinates(input.coordinates, 'activity');
    const exactTiming = LocalDateTime.normalizeDayTimeRange({
      endDay,
      endTimeValue: input.schedule.endTime,
      label: 'activity time',
      startDay: day,
      startTimeValue: input.schedule.startTime
    });
    return {
      address: address || undefined,
      coordinates: input.coordinates,
      cost,
      notes: notes || undefined,
      schedule: {
        day,
        ...(endDay === day ? {} : { endDay }),
        ...exactTiming,
        timeBlock: input.schedule.timeBlock
      },
      title: ItineraryActivity.requiredText(
        input.title,
        'activity title',
        MAX_ACTIVITY_TITLE_LENGTH
      )
    };
  }

  static async forDestination(ctx: MutationCtx | QueryCtx, destinationId: Id<'tripDestinations'>) {
    const activities = await ctx.db
      .query('tripDestinationActivities')
      .withIndex('by_destinationId_and_position', (query) =>
        query.eq('destinationId', destinationId)
      )
      .take(ItineraryActivity.MAX_PER_DESTINATION + 1);
    if (activities.length > ItineraryActivity.MAX_PER_DESTINATION) {
      throw new ConvexError(
        `Destinations support up to ${ItineraryActivity.MAX_PER_DESTINATION} activities`
      );
    }
    return activities;
  }

  static async forTrip(ctx: MutationCtx | QueryCtx, tripId: Id<'trips'>) {
    const activities = await ctx.db
      .query('tripDestinationActivities')
      .withIndex('by_tripId_and_position', (query) => query.eq('tripId', tripId))
      .take(ItineraryActivity.MAX_PER_TRIP + 1);
    if (activities.length > ItineraryActivity.MAX_PER_TRIP) {
      throw new ConvexError(
        `Trips support up to ${ItineraryActivity.MAX_PER_TRIP} itinerary activities`
      );
    }
    return activities;
  }

  private static requiredText(value: string, label: string, maximum: number): string {
    const normalized = value.trim();
    if (normalized.length === 0 || normalized.length > maximum) {
      throw new ConvexError(`${label} must be between 1 and ${maximum} characters`);
    }
    return normalized;
  }
}
