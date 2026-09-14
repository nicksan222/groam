import { TripTargetKind } from '#convex/modules/travel/targets/kind';

export class DestinationTransferTarget extends TripTargetKind<
  'destination_transfer',
  'tripDestinationTransfers'
> {
  constructor() {
    super({
      attachments: { label: 'Transfers', maxPerTarget: 10, maxPerTrip: 190 },
      costBearing: true,
      costUpdatedEvent: 'destination_transfer_updated',
      notFoundMessage: 'Destination transfer not found',
      table: 'tripDestinationTransfers',
      type: 'destination_transfer'
    });
  }
}
