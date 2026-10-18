import { TripTargetKind } from '#convex/modules/travel/targets/kind';

export class TripTarget extends TripTargetKind<'trip', 'trips'> {
  constructor() {
    super({
      attachments: { label: 'Attachments', maxPerTarget: 10, maxPerTrip: 10 },
      contextTag: true,
      notFoundMessage: 'Trip target not found',
      table: 'trips',
      taggedNotFoundMessage: 'Tagged trip not found',
      type: 'trip'
    });
  }

  override catalogDescription(_tripName: string): string {
    return 'Trip';
  }
}
