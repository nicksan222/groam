import { TripTargetKind } from '#convex/modules/travel/targets/kind';
import type { Doc } from '#convex-generated/dataModel';
import type { QueryCtx } from '#convex-generated/server';

export class ActivityTarget extends TripTargetKind<'activity', 'tripDestinationActivities'> {
  constructor() {
    super({
      attachments: { label: 'Activities', maxPerTarget: 10, maxPerTrip: 2_000 },
      contextCatalogTake: 30,
      contextLabelField: 'title',
      contextTag: true,
      costBearing: true,
      costUpdatedEvent: 'itinerary_activity_updated',
      notFoundMessage: 'Itinerary activity not found',
      table: 'tripDestinationActivities',
      taggedNotFoundMessage: 'Tagged activity not found',
      type: 'activity'
    });
  }

  override catalogDescription(tripName: string, extras?: { destinationName?: string }): string {
    return `${tripName} · ${extras?.destinationName ?? 'Activity'}`;
  }

  override async contextDetails(_ctx: QueryCtx, document: object, label: string): Promise<unknown> {
    const activity = document as Doc<'tripDestinationActivities'>;
    return {
      address: activity.address ?? null,
      notes: activity.notes ?? null,
      schedule: activity.schedule ?? null,
      title: activity.title ?? label
    };
  }
}
