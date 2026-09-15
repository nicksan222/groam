import { TripTargetKind } from '#convex/modules/travel/targets/kind';

export class StayTarget extends TripTargetKind<'stay', 'tripDestinationStays'> {
  constructor() {
    super({
      attachments: { label: 'Stays', maxPerTarget: 10, maxPerTrip: 500 },
      contextLabelField: 'title',
      costBearing: true,
      costUpdatedEvent: 'stay_updated',
      notFoundMessage: 'Trip stay not found',
      table: 'tripDestinationStays',
      type: 'stay'
    });
  }
}
