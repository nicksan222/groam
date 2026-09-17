import { ConvexError, type Infer } from 'convex/values';
import { Attachments } from '#convex/modules/media/attachments/index';
import type { TripStayValidators } from '#convex/modules/travel/stays/schema';
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
import { normalizeCostRecord } from '#convex/modules/travel/trips/normalize';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';

const MAX_ADDRESS_LENGTH = 240;
const MAX_NOTES_LENGTH = 500;
const MAX_TITLE_LENGTH = 100;

export type TripStayInput = Infer<typeof TripStayValidators.input>;

export class TripStay {
  static readonly MAX_ATTACHMENTS = 5;
  static readonly MAX_PER_DESTINATION = 20;
  static readonly MAX_PER_TRIP = 100;

  private constructor(
    private readonly ctx: MutationCtx,
    private readonly trip: MutableTripCtx,
    readonly data: Doc<'tripDestinationStays'>,
    readonly destination: Doc<'tripDestinations'>
  ) {}

  static async add(
    ctx: MutationCtx,
    tripId: Id<'trips'>,
    destinationId: Id<'tripDestinations'>,
    input: TripStayInput
  ): Promise<Id<'tripDestinationStays'>> {
    const [trip, destination] = await Promise.all([
      loadTripContext(ctx, tripId),
      ctx.db.get('tripDestinations', destinationId)
    ]);
    assertMutable(trip);
    if (!destination || destination.tripId !== tripId) {
      throw new ConvexError('Trip destination not found');
    }
    const normalized = TripStay.normalize(input, destination);
    assertDayWithinTrip(trip, normalized.schedule.checkOutDay, 'Stay checkout day');
    const [destinationStays, tripStays] = await Promise.all([
      TripStay.forDestination(ctx, destinationId),
      TripStay.forTrip(ctx, tripId)
    ]);
    if (destinationStays.length >= TripStay.MAX_PER_DESTINATION) {
      throw new ConvexError(`Destinations support up to ${TripStay.MAX_PER_DESTINATION} stays`);
    }
    if (tripStays.length >= TripStay.MAX_PER_TRIP) {
      throw new ConvexError(`Trips support up to ${TripStay.MAX_PER_TRIP} stays`);
    }
    const stayId = await ctx.db.insert('tripDestinationStays', {
      ...normalized,
      destinationId,
      position: destinationStays.length,
      tripId
    });
    await Attachments.setTarget(ctx, {
      label: 'Stays',
      maximum: TripStay.MAX_ATTACHMENTS,
      mediaIds: input.attachmentIds,
      organizationId: trip.workspace.organizationId,
      target: { id: stayId, type: 'stay' },
      tripId
    });
    await patchTrip(trip, { updatedAt: Date.now() });
    await recordActivity(
      trip,
      'stay_added',
      `${trip.workspace.viewerName} added ${normalized.title} in ${destination.name}`
    );
    return stayId;
  }

  static async find(
    ctx: MutationCtx,
    tripId: Id<'trips'>,
    stayId: Id<'tripDestinationStays'>
  ): Promise<TripStay> {
    const [trip, stay] = await Promise.all([
      loadTripContext(ctx, tripId),
      ctx.db.get('tripDestinationStays', stayId)
    ]);
    if (!stay || stay.tripId !== tripId) throw new ConvexError('Trip stay not found');
    const destination = await ctx.db.get('tripDestinations', stay.destinationId);
    if (!destination || destination.tripId !== tripId) {
      throw new ConvexError('Trip destination not found');
    }
    return new TripStay(ctx, trip, stay, destination);
  }

  async update(input: TripStayInput): Promise<null> {
    assertMutable(this.trip);
    const normalized = TripStay.normalize(input, this.destination);
    assertDayWithinTrip(this.trip, normalized.schedule.checkOutDay, 'Stay checkout day');
    const attachmentsChanged = await Attachments.setTarget(this.ctx, {
      label: 'Stays',
      maximum: TripStay.MAX_ATTACHMENTS,
      mediaIds: input.attachmentIds,
      organizationId: this.trip.workspace.organizationId,
      target: { id: this.data._id, type: 'stay' },
      tripId: this.trip.trip._id
    });
    const detailsMatch = TripStay.matches(this.data, normalized);
    if (detailsMatch && !attachmentsChanged) return null;
    await patchTrip(this.trip, { updatedAt: Date.now() });
    if (!detailsMatch)
      await this.ctx.db.patch('tripDestinationStays', this.data._id, {
        ...normalized,
        address: normalized.address,
        cost: normalized.cost,
        notes: normalized.notes
      });
    await patchTrip(this.trip, { updatedAt: Date.now() });
    await recordActivity(
      this.trip,
      'stay_updated',
      `${this.trip.workspace.viewerName} updated ${normalized.title} in ${this.destination.name}`
    );
    return null;
  }

  async delete(): Promise<null> {
    assertMutable(this.trip);
    const stays = await TripStay.forDestination(this.ctx, this.destination._id);
    const remaining = stays.filter((stay) => stay._id !== this.data._id);
    await TripStay.deleteOwned(this.ctx, this.data);
    await Promise.all(
      remaining.map((stay, position) =>
        stay.position === position
          ? null
          : this.ctx.db.patch('tripDestinationStays', stay._id, { position })
      )
    );
    await patchTrip(this.trip, { updatedAt: Date.now() });
    await recordActivity(
      this.trip,
      'stay_removed',
      `${this.trip.workspace.viewerName} removed ${this.data.title} from ${this.destination.name}`
    );
    return null;
  }

  static async deleteForDestination(
    ctx: MutationCtx,
    destinationId: Id<'tripDestinations'>
  ): Promise<void> {
    const stays = await TripStay.forDestination(ctx, destinationId);
    await Promise.all(stays.map((stay) => TripStay.deleteOwned(ctx, stay)));
  }

  private static async deleteOwned(
    ctx: MutationCtx,
    stay: Doc<'tripDestinationStays'>
  ): Promise<void> {
    await Attachments.removeTarget(ctx, stay.tripId, { id: stay._id, type: 'stay' });
    await ctx.db.delete('tripDestinationStays', stay._id);
  }

  static async shiftForDestination(
    ctx: MutationCtx,
    destinationId: Id<'tripDestinations'>,
    dayShift: number
  ): Promise<void> {
    if (dayShift === 0) return;
    const stays = await TripStay.forDestination(ctx, destinationId);
    await Promise.all(
      stays.map((stay) =>
        ctx.db.patch('tripDestinationStays', stay._id, {
          schedule: {
            ...stay.schedule,
            checkInDay: stay.schedule.checkInDay + dayShift,
            checkOutDay: stay.schedule.checkOutDay + dayShift
          }
        })
      )
    );
  }

  static async forDestination(ctx: MutationCtx | QueryCtx, destinationId: Id<'tripDestinations'>) {
    const stays = await ctx.db
      .query('tripDestinationStays')
      .withIndex('by_destinationId_and_position', (query) =>
        query.eq('destinationId', destinationId)
      )
      .take(TripStay.MAX_PER_DESTINATION + 1);
    if (stays.length > TripStay.MAX_PER_DESTINATION) {
      throw new ConvexError(`Destinations support up to ${TripStay.MAX_PER_DESTINATION} stays`);
    }
    return stays;
  }

  static async forTrip(ctx: MutationCtx | QueryCtx, tripId: Id<'trips'>) {
    const stays = await ctx.db
      .query('tripDestinationStays')
      .withIndex('by_tripId_and_position', (query) => query.eq('tripId', tripId))
      .take(TripStay.MAX_PER_TRIP + 1);
    if (stays.length > TripStay.MAX_PER_TRIP) {
      throw new ConvexError(`Trips support up to ${TripStay.MAX_PER_TRIP} stays`);
    }
    return stays;
  }

  private static normalize(input: TripStayInput, destination: Doc<'tripDestinations'>) {
    const checkInDay = input.schedule.checkInDay;
    const checkOutDay = input.schedule.checkOutDay;
    if (
      !Number.isInteger(checkInDay) ||
      checkInDay < 1 ||
      checkInDay > 365 ||
      !Number.isInteger(checkOutDay) ||
      checkOutDay < checkInDay ||
      checkOutDay > 365
    ) {
      throw new ConvexError('stay days must be a valid chronological range');
    }
    if (
      destination.schedule &&
      (checkInDay < destination.schedule.startDay || checkOutDay > destination.schedule.endDay)
    ) {
      throw new ConvexError('stay days must fall within the destination day range');
    }
    const times = LocalDateTime.normalizeDayTimeRange({
      endDay: checkOutDay,
      endTimeValue: input.schedule.checkOutTime,
      label: 'stay time',
      startDay: checkInDay,
      startTimeValue: input.schedule.checkInTime
    });
    const address = TripStay.optionalText(input.address, 'stay address', MAX_ADDRESS_LENGTH);
    const notes = TripStay.optionalText(input.notes, 'stay notes', MAX_NOTES_LENGTH);
    const cost = normalizeCostRecord(input.cost, 'stay cost');
    return {
      ...(address ? { address } : {}),
      ...(cost === undefined ? {} : { cost }),
      ...(notes ? { notes } : {}),
      schedule: {
        checkInDay,
        ...(times.startTime ? { checkInTime: times.startTime } : {}),
        checkOutDay,
        ...(times.endTime ? { checkOutTime: times.endTime } : {})
      },
      title: TripStay.requiredText(input.title, 'stay name', MAX_TITLE_LENGTH)
    };
  }

  private static matches(
    existing: Doc<'tripDestinationStays'>,
    normalized: ReturnType<typeof TripStay.normalize>
  ) {
    return (
      existing.address === normalized.address &&
      costsMatch(existing.cost, normalized.cost) &&
      existing.notes === normalized.notes &&
      existing.schedule.checkInDay === normalized.schedule.checkInDay &&
      existing.schedule.checkInTime === normalized.schedule.checkInTime &&
      existing.schedule.checkOutDay === normalized.schedule.checkOutDay &&
      existing.schedule.checkOutTime === normalized.schedule.checkOutTime &&
      existing.title === normalized.title
    );
  }

  private static requiredText(value: string, label: string, maxLength: number) {
    const normalized = value.trim();
    if (normalized.length === 0 || normalized.length > maxLength) {
      throw new ConvexError(`${label} must be between 1 and ${maxLength} characters`);
    }
    return normalized;
  }

  private static optionalText(value: string | undefined, label: string, maxLength: number) {
    const normalized = value?.trim();
    if (normalized && normalized.length > maxLength) {
      throw new ConvexError(`${label} must be ${maxLength} characters or fewer`);
    }
    return normalized || undefined;
  }
}
