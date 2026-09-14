import { ConvexError } from 'convex/values';
import type { TripAssistantContext } from '#convex/modules/assistant/model/index';
import type { Id } from '#convex-generated/dataModel';

export { TRIP_TIME_BLOCKS as TIME_BLOCKS } from '#convex/modules/travel/activities/timeblocks';
export { TRIP_COST_KINDS } from '#convex/modules/travel/targets/costkinds';
export {
  TRIP_COST_SPLITS,
  tripCostSplit
} from '#convex/modules/travel/trips/costs';
export {
  DEFAULT_TRIP_CURRENCY,
  TRIP_CURRENCIES as CURRENCIES
} from '#convex/modules/travel/trips/currencies';

export const MAX_TITLE_LENGTH = 100;
export const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
export const TIME_PATTERN = /^\d{2}:\d{2}$/u;
export const TRANSFER_MODES = [
  'walk',
  'bicycle',
  'car',
  'rideshare',
  'taxi',
  'public_transit',
  'bus',
  'train',
  'flight',
  'ferry',
  'shuttle',
  'other'
] as const;

export function statusSnapshot(context: TripAssistantContext) {
  return {
    archived: context.archived,
    currency: context.currency,
    dateNotes: context.dateNotes,
    destinationCount: context.destinations.length,
    groupMemberCount: context.groupMemberCount,
    initialBudget: context.initialBudget,
    primaryDestination: context.primaryDestination,
    startDate: context.startDate,
    totalDurationDays: context.totalDurationDays,
    totalPlannedCost: context.totalPlannedCost,
    tripName: context.tripName
  };
}

export function itinerarySnapshot(context: TripAssistantContext) {
  return {
    costTargets: context.costTargets,
    currency: context.currency,
    destinations: context.destinations,
    initialBudget: context.initialBudget,
    startDate: context.startDate,
    totalDurationDays: context.totalDurationDays,
    totalPlannedCost: context.totalPlannedCost,
    tripName: context.tripName
  };
}

export function schedulableDestinations(context: TripAssistantContext) {
  return context.destinations.flatMap((destination) => {
    const maximumDay = destination.endDay ?? context.totalDurationDays;
    const minimumDay = destination.startDay ?? 1;
    return maximumDay !== null && minimumDay <= maximumDay
      ? [{ ...destination, maximumDay, minimumDay }]
      : [];
  });
}

export function assertDraftProposal(context: TripAssistantContext) {
  if (context.proposalStatus !== 'draft') {
    throw new ConvexError('Only a draft idea can be written to');
  }
  if (!context.canEdit) throw new ConvexError('You cannot edit this trip');
}

export function requestedTripId(inputTripId: string | undefined, activeTripId: Id<'trips'> | null) {
  const tripId = inputTripId ? (inputTripId as Id<'trips'>) : activeTripId;
  if (!tripId) throw new ConvexError('Find or attach a trip before using this tool');
  return tripId;
}

export function findActivity(context: TripAssistantContext, activityId: string) {
  for (const destination of context.destinations) {
    const activity = destination.activities.find((item) => item.id === activityId);
    if (activity) return { activity, destination };
  }
  return null;
}

export function findStay(context: TripAssistantContext, stayId: string) {
  for (const destination of context.destinations) {
    const stay = destination.stays.find((item) => item.id === stayId);
    if (stay) return { destination, stay };
  }
  return null;
}
