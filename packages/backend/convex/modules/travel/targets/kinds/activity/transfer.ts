import { TripTargetKind } from '#convex/modules/travel/targets/kind';

export class ActivityTransferTarget extends TripTargetKind<
  'activity_transfer',
  'tripActivityTransfers'
> {
  constructor() {
    super({
      attachments: { label: 'Transfers', maxPerTarget: 10, maxPerTrip: 1_990 },
      costBearing: true,
      costUpdatedEvent: 'activity_transfer_updated',
      notFoundMessage: 'Activity transfer not found',
      table: 'tripActivityTransfers',
      type: 'activity_transfer'
    });
  }
}
