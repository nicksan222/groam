import { v } from 'convex/values';
import { TRIP_COST_KINDS } from '#convex/modules/travel/targets/costkinds';
import {
  activity,
  activityTransfer,
  attachment,
  boundaryTransfer,
  destination,
  destinationTransfer,
  stay,
  trip
} from '#convex/modules/travel/targets/kinds/index';

export { TRIP_COST_KINDS } from '#convex/modules/travel/targets/costkinds';

export const TripTargetValidators = {
  attachable: v.union(
    trip.targetValidator,
    destination.targetValidator,
    activity.targetValidator,
    stay.targetValidator,
    destinationTransfer.targetValidator,
    activityTransfer.targetValidator,
    boundaryTransfer.targetValidator
  ),
  collaborative: v.union(
    trip.targetValidator,
    destination.targetValidator,
    activity.targetValidator,
    stay.targetValidator,
    destinationTransfer.targetValidator,
    activityTransfer.targetValidator,
    boundaryTransfer.targetValidator,
    attachment.targetValidator
  ),
  contextTag: v.union(trip.tagValidator, destination.tagValidator, activity.tagValidator),
  contextTagKind: v.union(
    v.literal(trip.type),
    v.literal(destination.type),
    v.literal(activity.type)
  ),
  costBearing: v.union(
    activity.targetValidator,
    stay.targetValidator,
    activityTransfer.targetValidator,
    boundaryTransfer.targetValidator,
    destinationTransfer.targetValidator
  ),
  costKind: v.union(
    v.literal(TRIP_COST_KINDS[0]),
    v.literal(TRIP_COST_KINDS[1]),
    v.literal(TRIP_COST_KINDS[2]),
    v.literal(TRIP_COST_KINDS[3]),
    v.literal(TRIP_COST_KINDS[4])
  )
};
