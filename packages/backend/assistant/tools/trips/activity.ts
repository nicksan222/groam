import { createTool } from '@convex-dev/agent';
import { ConvexError, type Infer } from 'convex/values';
import * as z from 'zod/v3';
import {
  assertDraftProposal,
  findActivity,
  MAX_TITLE_LENGTH,
  requestedTripId,
  schedulableDestinations,
  TIME_BLOCKS,
  TRIP_COST_SPLITS,
  tripCostSplit
} from '#backend/assistant/tools/trips/shared';
import type { TripAssistantContext } from '#convex/modules/assistant/model/index';
import type { TripActivityValidators } from '#convex/modules/travel/activities/schema';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';

function addActivityInputFromTool(input: {
  address?: string;
  costAmount?: number;
  costSplit?: (typeof TRIP_COST_SPLITS)[number];
  day: number;
  notes?: string;
  timeBlock: (typeof TIME_BLOCKS)[number];
  title: string;
}): Infer<typeof TripActivityValidators.input> {
  return {
    ...(input.address ? { address: input.address } : {}),
    ...(input.costAmount === undefined
      ? {}
      : { cost: { amount: input.costAmount, split: tripCostSplit(input.costSplit) } }),
    ...(input.notes ? { notes: input.notes } : {}),
    schedule: { day: input.day, timeBlock: input.timeBlock },
    title: input.title
  };
}

export function createAddActivityTool(activeTripId: Id<'trips'> | null) {
  return createTool({
    description:
      'Add one activity to a DRAFT idea. Call startTripVersion first and use its workingTripId plus idea-specific destination ids. Call again for each additional activity. Days must fall inside the stop’s current range — call extendItinerary first when adding a new day.',
    execute: async (toolCtx, input) => {
      const tripId = requestedTripId(input.tripId, activeTripId);
      const context: TripAssistantContext = await toolCtx.runQuery(
        internal.modules.assistant.model.index.tripContext,
        { tripId }
      );
      assertDraftProposal(context);
      const destinations = schedulableDestinations(context);
      const destination = destinations.find((candidate) => candidate.id === input.destinationId);
      if (!destination) throw new ConvexError('That destination is not available for scheduling');
      if (input.day < destination.minimumDay || input.day > destination.maximumDay) {
        throw new ConvexError(
          `${destination.name} activities must be scheduled between trip days ${destination.minimumDay} and ${destination.maximumDay}`
        );
      }
      const activityId: Id<'tripDestinationActivities'> = await toolCtx.runMutation(
        internal.modules.assistant.model.index.addActivity,
        {
          destinationId: destination.id,
          input: addActivityInputFromTool(input),
          tripId
        }
      );
      return {
        activityId,
        title: input.title.trim()
      };
    },
    inputSchema: z.object({
      address: z
        .string()
        .max(240)
        .optional()
        .describe('A verified place name or street address. Omit when uncertain.'),
      costAmount: z
        .number()
        .min(0)
        .max(1_000_000_000)
        .optional()
        .describe(
          'Estimated cost in the trip currency. Use costSplit to say whether this is the group total or per person. Omit when unknown.'
        ),
      costSplit: z
        .enum(TRIP_COST_SPLITS)
        .optional()
        .describe(
          'Whether costAmount is the group total or per person. Defaults to total. Per-person amounts are multiplied by group size toward the trip budget.'
        ),
      day: z.number().int().min(1).max(365).describe('The trip day number.'),
      destinationId: z.string().describe('An exact destination id returned by context tools.'),
      notes: z.string().max(240).optional().describe('A concise practical or booking note.'),
      timeBlock: z.enum(TIME_BLOCKS).describe('The broad part of the selected day.'),
      title: z.string().min(1).max(MAX_TITLE_LENGTH).describe('A specific activity title.'),
      tripId: z
        .string()
        .optional()
        .describe(
          'The exact workingTripId returned by startTripVersion. Never use the shared trip id.'
        )
    })
  });
}

function activityPatchFromTool(input: {
  address?: string;
  costAmount?: number | null;
  costSplit?: (typeof TRIP_COST_SPLITS)[number];
  day?: number;
  notes?: string;
  timeBlock?: (typeof TIME_BLOCKS)[number];
  title?: string;
}) {
  return {
    ...(input.address === undefined ? {} : { address: input.address }),
    ...(input.costAmount === undefined ? {} : { costAmount: input.costAmount }),
    ...(input.costSplit === undefined ? {} : { costSplit: input.costSplit }),
    ...(input.day === undefined ? {} : { day: input.day }),
    ...(input.notes === undefined ? {} : { notes: input.notes }),
    ...(input.timeBlock === undefined ? {} : { timeBlock: input.timeBlock }),
    ...(input.title === undefined ? {} : { title: input.title })
  };
}

export function createUpdateActivityTool(activeTripId: Id<'trips'> | null) {
  return createTool({
    description:
      'Patch an existing activity on a DRAFT idea. Call startTripVersion first and pass its workingTripId plus an idea-specific activity id. Omit fields you are not changing. Pass costAmount null to clear the cost. Days must fall inside the stop’s current range.',
    execute: async (toolCtx, input) => {
      const tripId = requestedTripId(input.tripId, activeTripId);
      const context: TripAssistantContext = await toolCtx.runQuery(
        internal.modules.assistant.model.index.tripContext,
        { tripId }
      );
      assertDraftProposal(context);
      const found = findActivity(context, input.activityId);
      if (!found) throw new ConvexError('That activity is not on this idea');
      const patch = activityPatchFromTool(input);
      if (Object.keys(patch).length === 0) {
        throw new ConvexError('Provide at least one field to update');
      }
      if (input.day !== undefined) {
        const destination = schedulableDestinations(context).find(
          (candidate) => candidate.id === found.destination.id
        );
        if (!destination) {
          throw new ConvexError('That destination is not available for scheduling');
        }
        if (input.day < destination.minimumDay || input.day > destination.maximumDay) {
          throw new ConvexError(
            `${destination.name} activities must be scheduled between trip days ${destination.minimumDay} and ${destination.maximumDay}`
          );
        }
      }
      await toolCtx.runMutation(internal.modules.assistant.model.writes.updateActivity, {
        activityId: found.activity.id,
        patch,
        tripId
      });
      return {
        activityId: found.activity.id,
        title: input.title?.trim() ?? found.activity.title
      };
    },
    inputSchema: z.object({
      activityId: z.string().describe('An exact activity id returned by getItinerary.'),
      address: z
        .string()
        .max(240)
        .optional()
        .describe('A verified place name or street address. Pass an empty string to clear it.'),
      costAmount: z
        .number()
        .min(0)
        .max(1_000_000_000)
        .nullable()
        .optional()
        .describe('Estimated cost in the trip currency. Pass null to clear the cost.'),
      costSplit: z.enum(TRIP_COST_SPLITS).optional(),
      day: z.number().int().min(1).max(365).optional(),
      notes: z
        .string()
        .max(240)
        .optional()
        .describe('A concise practical or booking note. Pass an empty string to clear it.'),
      timeBlock: z.enum(TIME_BLOCKS).optional(),
      title: z.string().min(1).max(MAX_TITLE_LENGTH).optional(),
      tripId: z
        .string()
        .optional()
        .describe(
          'The exact workingTripId returned by startTripVersion. Never use the shared trip id.'
        )
    })
  });
}

export function createRemoveActivityTool(activeTripId: Id<'trips'> | null) {
  return createTool({
    description:
      'Remove an activity from a DRAFT idea. Call startTripVersion first and pass its workingTripId plus an idea-specific activity id.',
    execute: async (toolCtx, input) => {
      const tripId = requestedTripId(input.tripId, activeTripId);
      const context: TripAssistantContext = await toolCtx.runQuery(
        internal.modules.assistant.model.index.tripContext,
        { tripId }
      );
      assertDraftProposal(context);
      const found = findActivity(context, input.activityId);
      if (!found) throw new ConvexError('That activity is not on this idea');
      await toolCtx.runMutation(internal.modules.assistant.model.writes.removeActivity, {
        activityId: found.activity.id,
        tripId
      });
      return { activityId: found.activity.id, removed: true as const };
    },
    inputSchema: z.object({
      activityId: z.string().describe('An exact activity id returned by getItinerary.'),
      tripId: z
        .string()
        .optional()
        .describe(
          'The exact workingTripId returned by startTripVersion. Never use the shared trip id.'
        )
    })
  });
}
