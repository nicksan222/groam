import { createTool } from '@convex-dev/agent';
import { ConvexError, type Infer } from 'convex/values';
import * as z from 'zod/v3';
import {
  costAmountField,
  costSplitField,
  findStay,
  loadDraftTripContext,
  MAX_TITLE_LENGTH,
  requireSchedulableDestination,
  TIME_PATTERN,
  type TRIP_COST_SPLITS,
  tripCostSplit,
  tripDayField,
  workingTripIdField
} from '#backend/assistant/tools/trips/shared';
import type { TripAssistantContext } from '#convex/modules/assistant/model/index';
import type { TripStayValidators } from '#convex/modules/travel/stays/schema';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';

function addStayInputFromTool(input: {
  address?: string;
  checkInDay: number;
  checkInTime?: string;
  checkOutDay: number;
  checkOutTime?: string;
  costAmount?: number;
  costSplit?: (typeof TRIP_COST_SPLITS)[number];
  notes?: string;
  title: string;
}): Infer<typeof TripStayValidators.input> {
  return {
    ...(input.address ? { address: input.address } : {}),
    ...(input.costAmount === undefined
      ? {}
      : { cost: { amount: input.costAmount, split: tripCostSplit(input.costSplit) } }),
    ...(input.notes ? { notes: input.notes } : {}),
    schedule: {
      checkInDay: input.checkInDay,
      ...(input.checkInTime ? { checkInTime: input.checkInTime } : {}),
      checkOutDay: input.checkOutDay,
      ...(input.checkOutTime ? { checkOutTime: input.checkOutTime } : {})
    },
    title: input.title
  };
}

export function createAddStayTool(activeTripId: Id<'trips'> | null) {
  return createTool({
    description:
      'Add one explicitly selected accommodation to a DRAFT idea only. Call startTripVersion first and use its workingTripId plus idea-specific destination ids.',
    execute: async (toolCtx, input) => {
      const { context, tripId } = await loadDraftTripContext(toolCtx, input.tripId, activeTripId);
      const destination = requireSchedulableDestination(context, input.destinationId);
      if (input.checkInDay < destination.minimumDay || input.checkOutDay > destination.maximumDay) {
        throw new ConvexError(
          `${destination.name} stays must fit between trip days ${destination.minimumDay} and ${destination.maximumDay}`
        );
      }
      const stayId: Id<'tripDestinationStays'> = await toolCtx.runMutation(
        internal.modules.assistant.model.index.addStay,
        {
          destinationId: destination.id,
          input: addStayInputFromTool(input),
          tripId
        }
      );
      return {
        stayId,
        title: input.title.trim()
      };
    },
    inputSchema: z.object({
      address: z.string().max(240).optional(),
      checkInDay: tripDayField(),
      checkInTime: z.string().regex(TIME_PATTERN).optional(),
      checkOutDay: tripDayField(),
      checkOutTime: z.string().regex(TIME_PATTERN).optional(),
      costAmount: costAmountField().describe(
        'Estimated cost in the trip currency. Use costSplit to say whether this is the group total or per person.'
      ),
      costSplit: costSplitField().describe(
        'Whether costAmount is the group total or per person. Defaults to total. Per-person amounts are multiplied by group size toward the trip budget.'
      ),
      destinationId: z.string().describe('An exact destination id returned by getItinerary.'),
      notes: z.string().max(500).optional(),
      title: z.string().min(1).max(MAX_TITLE_LENGTH),
      tripId: workingTripIdField()
    })
  });
}

function stayPatchFromTool(input: {
  address?: string;
  checkInDay?: number;
  checkInTime?: string;
  checkOutDay?: number;
  checkOutTime?: string;
  costAmount?: number | null;
  costSplit?: (typeof TRIP_COST_SPLITS)[number];
  notes?: string;
  title?: string;
}) {
  return {
    ...(input.address === undefined ? {} : { address: input.address }),
    ...(input.checkInDay === undefined ? {} : { checkInDay: input.checkInDay }),
    ...(input.checkInTime === undefined ? {} : { checkInTime: input.checkInTime }),
    ...(input.checkOutDay === undefined ? {} : { checkOutDay: input.checkOutDay }),
    ...(input.checkOutTime === undefined ? {} : { checkOutTime: input.checkOutTime }),
    ...(input.costAmount === undefined ? {} : { costAmount: input.costAmount }),
    ...(input.costSplit === undefined ? {} : { costSplit: input.costSplit }),
    ...(input.notes === undefined ? {} : { notes: input.notes }),
    ...(input.title === undefined ? {} : { title: input.title })
  };
}

function assertStayPatchFits(
  input: Parameters<typeof stayPatchFromTool>[0],
  found: NonNullable<ReturnType<typeof findStay>>,
  context: TripAssistantContext
): void {
  if (input.checkInDay === undefined && input.checkOutDay === undefined) return;
  const destination = requireSchedulableDestination(context, found.destination.id);
  const checkInDay = input.checkInDay ?? found.stay.checkInDay;
  const checkOutDay = input.checkOutDay ?? found.stay.checkOutDay;
  if (checkInDay < destination.minimumDay || checkOutDay > destination.maximumDay) {
    throw new ConvexError(
      `${destination.name} stays must fit between trip days ${destination.minimumDay} and ${destination.maximumDay}`
    );
  }
}

export function createUpdateStayTool(activeTripId: Id<'trips'> | null) {
  return createTool({
    description:
      'Patch an existing stay on a DRAFT idea. Call startTripVersion first and pass its workingTripId plus an idea-specific stay id. Omit fields you are not changing. Pass costAmount null to clear the cost.',
    execute: async (toolCtx, input) => {
      const { context, tripId } = await loadDraftTripContext(toolCtx, input.tripId, activeTripId);
      const found = findStay(context, input.stayId);
      if (!found) throw new ConvexError('That stay is not on this idea');
      const patch = stayPatchFromTool(input);
      if (Object.keys(patch).length === 0) {
        throw new ConvexError('Provide at least one field to update');
      }
      assertStayPatchFits(input, found, context);
      await toolCtx.runMutation(internal.modules.assistant.model.writes.updateStay, {
        patch,
        stayId: found.stay.id,
        tripId
      });
      return { stayId: found.stay.id, title: input.title?.trim() ?? found.stay.title };
    },
    inputSchema: z.object({
      address: z.string().max(240).optional(),
      checkInDay: tripDayField().optional(),
      checkInTime: z.string().regex(TIME_PATTERN).optional(),
      checkOutDay: tripDayField().optional(),
      checkOutTime: z.string().regex(TIME_PATTERN).optional(),
      costAmount: costAmountField('optional-nullable'),
      costSplit: costSplitField(),
      notes: z.string().max(500).optional(),
      stayId: z.string().describe('An exact stay id returned by getItinerary.'),
      title: z.string().min(1).max(MAX_TITLE_LENGTH).optional(),
      tripId: workingTripIdField()
    })
  });
}

export function createRemoveStayTool(activeTripId: Id<'trips'> | null) {
  return createTool({
    description:
      'Remove a stay from a DRAFT idea. Call startTripVersion first and pass its workingTripId plus an idea-specific stay id.',
    execute: async (toolCtx, input) => {
      const { context, tripId } = await loadDraftTripContext(toolCtx, input.tripId, activeTripId);
      const found = findStay(context, input.stayId);
      if (!found) throw new ConvexError('That stay is not on this idea');
      await toolCtx.runMutation(internal.modules.assistant.model.writes.removeStay, {
        stayId: found.stay.id,
        tripId
      });
      return { removed: true as const, stayId: found.stay.id };
    },
    inputSchema: z.object({
      stayId: z.string().describe('An exact stay id returned by getItinerary.'),
      tripId: workingTripIdField()
    })
  });
}
