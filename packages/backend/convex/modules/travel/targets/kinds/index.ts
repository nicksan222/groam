import { TripTargetKind } from '#convex/modules/travel/targets/kind';
import { ActivityTarget } from '#convex/modules/travel/targets/kinds/activity/index';
import { ActivityTransferTarget } from '#convex/modules/travel/targets/kinds/activity/transfer';
import { AttachmentTarget } from '#convex/modules/travel/targets/kinds/attachment/index';
import { BoundaryTransferTarget } from '#convex/modules/travel/targets/kinds/boundary/transfer';
import { DestinationTarget } from '#convex/modules/travel/targets/kinds/destination/index';
import { DestinationTransferTarget } from '#convex/modules/travel/targets/kinds/destination/transfer';
import { StayTarget } from '#convex/modules/travel/targets/kinds/stay/index';
import { TripTarget } from '#convex/modules/travel/targets/kinds/trip/index';

export const activity = TripTargetKind.subscribe(new ActivityTarget());
export const activityTransfer = TripTargetKind.subscribe(new ActivityTransferTarget());
export const attachment = TripTargetKind.subscribe(new AttachmentTarget());
export const boundaryTransfer = TripTargetKind.subscribe(new BoundaryTransferTarget());
export const destination = TripTargetKind.subscribe(new DestinationTarget());
export const destinationTransfer = TripTargetKind.subscribe(new DestinationTransferTarget());
export const stay = TripTargetKind.subscribe(new StayTarget());
export const trip = TripTargetKind.subscribe(new TripTarget());
