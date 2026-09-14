import { TripTargetKind } from '#convex/modules/travel/targets/kind';

export class BoundaryTransferTarget extends TripTargetKind<
  'boundary_transfer',
  'tripBoundaryTransfers'
> {
  constructor() {
    super({
      attachments: { label: 'Transfers', maxPerTarget: 10, maxPerTrip: 20 },
      costBearing: true,
      costUpdatedEvent: 'boundary_transfer_updated',
      notFoundMessage: 'Trip boundary transfer not found',
      table: 'tripBoundaryTransfers',
      type: 'boundary_transfer'
    });
  }
}
