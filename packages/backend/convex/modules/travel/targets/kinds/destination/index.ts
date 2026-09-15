import { TripTargetKind } from '#convex/modules/travel/targets/kind';
import type { Doc } from '#convex-generated/dataModel';
import type { QueryCtx } from '#convex-generated/server';

export class DestinationTarget extends TripTargetKind<'destination', 'tripDestinations'> {
  constructor() {
    super({
      attachments: { label: 'Destinations', maxPerTarget: 10, maxPerTrip: 200 },
      contextCatalogTake: 20,
      contextTag: true,
      notFoundMessage: 'Trip destination not found',
      table: 'tripDestinations',
      taggedNotFoundMessage: 'Tagged destination not found',
      type: 'destination'
    });
  }

  override catalogDescription(tripName: string): string {
    return `${tripName} · Destination`;
  }

  override async contextDetails(ctx: QueryCtx, document: object, label: string): Promise<unknown> {
    const destination = document as Doc<'tripDestinations'>;
    const activities = await ctx.db
      .query('tripDestinationActivities')
      .withIndex('by_destinationId_and_position', (query) =>
        query.eq('destinationId', destination._id)
      )
      .take(100);
    return {
      dayNotes: destination.dayNotes ?? null,
      endDay: destination.schedule?.endDay ?? null,
      name: destination.name ?? label,
      scheduledActivities: activities.map((activity) => ({
        day: activity.schedule.day,
        timeBlock: activity.schedule.timeBlock,
        title: activity.title
      })),
      startDay: destination.schedule?.startDay ?? null
    };
  }
}
