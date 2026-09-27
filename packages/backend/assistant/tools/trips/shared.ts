import { ConvexError } from 'convex/values';
import * as z from 'zod/v3';
import type { TripAssistantContext } from '#convex/modules/assistant/model/index';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';

export { TRIP_TIME_BLOCKS as TIME_BLOCKS } from '#convex/modules/travel/activities/timeblocks';
export { TRIP_COST_KINDS } from '#convex/modules/travel/targets/costkinds';

import { TRIP_COST_SPLITS, tripCostSplit } from '#convex/modules/travel/trips/costs';

export {
  DEFAULT_TRIP_CURRENCY,
  TRIP_CURRENCIES as CURRENCIES
} from '#convex/modules/travel/trips/currencies';
export { TRIP_COST_SPLITS, tripCostSplit };

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

function schedulableDestinations(context: TripAssistantContext) {
  return context.destinations.flatMap((destination) => {
    const maximumDay = destination.endDay ?? context.totalDurationDays;
    const minimumDay = destination.startDay ?? 1;
    return maximumDay !== null && minimumDay <= maximumDay
      ? [{ ...destination, maximumDay, minimumDay }]
      : [];
  });
}

function assertDraftProposal(context: TripAssistantContext) {
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

// Draft-idea preamble shared by every trip write: resolve the trip, load its
// context, and require a draft the traveler can edit.
export async function loadDraftTripContext(
  toolCtx: unknown,
  inputTripId: string | undefined,
  activeTripId: Id<'trips'> | null
): Promise<{ context: TripAssistantContext; tripId: Id<'trips'> }> {
  const tripId = requestedTripId(inputTripId, activeTripId);
  // ToolCtx.runQuery is generic over every query; narrow to the one query used here.
  const runner = toolCtx as {
    runQuery(query: unknown, args: { tripId: Id<'trips'> }): Promise<TripAssistantContext>;
  };
  const context = await runner.runQuery(internal.modules.assistant.model.index.tripContext, {
    tripId
  });
  assertDraftProposal(context);
  return { context, tripId };
}

export function requireSchedulableDestination(
  context: TripAssistantContext,
  destinationId: string
) {
  const destination = schedulableDestinations(context).find(
    (candidate) => candidate.id === destinationId
  );
  if (!destination) throw new ConvexError('That destination is not available for scheduling');
  return destination;
}

export function workingTripIdField() {
  return z
    .string()
    .optional()
    .describe(
      'The exact workingTripId returned by startTripVersion. Never use the shared trip id.'
    );
}

export function tripDayField() {
  return z.number().int().min(1).max(365);
}

export function costAmountField(mode: 'nullable'): z.ZodNullable<z.ZodNumber>;
export function costAmountField(
  mode: 'optional-nullable'
): z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
export function costAmountField(mode?: 'optional'): z.ZodOptional<z.ZodNumber>;
export function costAmountField(mode: 'optional' | 'nullable' | 'optional-nullable' = 'optional') {
  const base = z.number().min(0).max(1_000_000_000);
  if (mode === 'nullable') return base.nullable();
  if (mode === 'optional-nullable') return base.nullable().optional();
  return base.optional();
}

export function costSplitField() {
  return z.enum(TRIP_COST_SPLITS).optional();
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
