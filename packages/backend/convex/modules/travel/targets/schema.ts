import { type Infer, v } from 'convex/values';
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

const aboutFields = { day: v.union(v.number(), v.null()), label: v.string() };

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
  /** A thing on the plan itself: what a person can point at, not the trip or a file. */
  planItem: v.union(
    destination.targetValidator,
    activity.targetValidator,
    stay.targetValidator,
    destinationTransfer.targetValidator,
    activityTransfer.targetValidator,
    boundaryTransfer.targetValidator
  ),
  /** A plan item as an issue reads it back: the pointer, its name, and the day it falls on. */
  planItemAbout: v.union(
    destination.targetValidator.extend(aboutFields),
    activity.targetValidator.extend(aboutFields),
    stay.targetValidator.extend(aboutFields),
    destinationTransfer.targetValidator.extend(aboutFields),
    activityTransfer.targetValidator.extend(aboutFields),
    boundaryTransfer.targetValidator.extend(aboutFields)
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

/** A pointer to a thing on the plan: see `TripTargetValidators.planItem`. */
export type PlanItemRef = Infer<typeof TripTargetValidators.planItem>;
export type PlanItemAbout = Infer<typeof TripTargetValidators.planItemAbout>;
