import { createTool } from '@convex-dev/agent';
import { ConvexError } from 'convex/values';
import * as z from 'zod/v3';
import {
  assertDraftProposal,
  requestedTripId,
  TIME_PATTERN,
  TRANSFER_MODES,
  TRIP_COST_SPLITS,
  tripCostSplit
} from '#backend/assistant/tools/trips/shared';
import type { TripAssistantContext } from '#convex/modules/assistant/model/index';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';

function transferInputFromTool(input: {
  costAmount?: number;
  costSplit?: (typeof TRIP_COST_SPLITS)[number];
  durationMinutes?: number;
  endDay?: number;
  endTime?: string;
  mode: (typeof TRANSFER_MODES)[number];
  notes?: string;
  startDay?: number;
  startTime?: string;
}) {
  if (
    (input.startDay === undefined) !== (input.startTime === undefined) ||
    (input.endDay !== undefined && input.startDay === undefined) ||
    (input.endTime !== undefined && input.startTime === undefined)
  ) {
    throw new ConvexError('Transfer timing needs startDay and startTime');
  }
  return {
    ...(input.costAmount === undefined
      ? {}
      : { cost: { amount: input.costAmount, split: tripCostSplit(input.costSplit) } }),
    ...(input.durationMinutes === undefined
      ? {}
      : { duration: { minutes: input.durationMinutes } }),
    mode: input.mode,
    ...(input.notes ? { notes: input.notes } : {}),
    ...(input.startDay === undefined || input.startTime === undefined
      ? {}
      : {
          timing: {
            ...(input.endDay === undefined ? {} : { endDay: input.endDay }),
            ...(input.endTime === undefined ? {} : { endTime: input.endTime }),
            startDay: input.startDay,
            startTime: input.startTime
          }
        })
  };
}

function transferTargetFromTool(input: {
  fromActivityId?: string;
  fromDestinationId?: string;
  kind: 'activity' | 'arrival' | 'departure' | 'destination';
  toActivityId?: string;
  toDestinationId?: string;
}) {
  if (input.kind === 'arrival' || input.kind === 'departure') return { kind: input.kind };
  if (input.kind === 'destination') {
    if (!input.fromDestinationId || !input.toDestinationId) {
      throw new ConvexError('Destination transfers need fromDestinationId and toDestinationId');
    }
    return {
      fromDestinationId: input.fromDestinationId as Id<'tripDestinations'>,
      kind: 'destination' as const,
      toDestinationId: input.toDestinationId as Id<'tripDestinations'>
    };
  }
  if (!input.fromActivityId || !input.toActivityId) {
    throw new ConvexError('Activity transfers need fromActivityId and toActivityId');
  }
  return {
    fromActivityId: input.fromActivityId as Id<'tripDestinationActivities'>,
    kind: 'activity' as const,
    toActivityId: input.toActivityId as Id<'tripDestinationActivities'>
  };
}

export function createSetTransferTool(activeTripId: Id<'trips'> | null) {
  return createTool({
    description:
      'Set arrival, departure, between-stop, or between-activity travel on a DRAFT idea. Call startTripVersion first and pass its workingTripId. Use getItinerary ids for destinations and activities.',
    execute: async (toolCtx, input) => {
      const tripId = requestedTripId(input.tripId, activeTripId);
      const context: TripAssistantContext = await toolCtx.runQuery(
        internal.modules.assistant.model.index.tripContext,
        { tripId }
      );
      assertDraftProposal(context);
      const transferId: string = await toolCtx.runMutation(
        internal.modules.assistant.model.writes.setTransfer,
        {
          input: transferInputFromTool(input),
          target: transferTargetFromTool(input),
          tripId
        }
      );
      return { kind: input.kind, mode: input.mode, transferId };
    },
    inputSchema: z.object({
      costAmount: z.number().min(0).max(1_000_000_000).optional(),
      costSplit: z.enum(TRIP_COST_SPLITS).optional(),
      durationMinutes: z.number().int().min(1).max(10_080).optional(),
      endDay: z.number().int().min(1).max(365).optional(),
      endTime: z.string().regex(TIME_PATTERN).optional(),
      fromActivityId: z
        .string()
        .optional()
        .describe('Required when kind is activity. The earlier activity id.'),
      fromDestinationId: z
        .string()
        .optional()
        .describe('Required when kind is destination. The earlier stop id.'),
      kind: z
        .enum(['activity', 'arrival', 'departure', 'destination'])
        .describe(
          'arrival and departure are trip-level. destination is travel between stops. activity is travel between activities.'
        ),
      mode: z.enum(TRANSFER_MODES),
      notes: z.string().max(500).optional(),
      startDay: z.number().int().min(1).max(365).optional(),
      startTime: z.string().regex(TIME_PATTERN).optional(),
      toActivityId: z
        .string()
        .optional()
        .describe('Required when kind is activity. The later activity id.'),
      toDestinationId: z
        .string()
        .optional()
        .describe('Required when kind is destination. The later stop id.'),
      tripId: z
        .string()
        .optional()
        .describe(
          'The exact workingTripId returned by startTripVersion. Never use the shared trip id.'
        )
    })
  });
}

export function createRemoveTransferTool(activeTripId: Id<'trips'> | null) {
  return createTool({
    description:
      'Remove travel from a DRAFT idea. Call startTripVersion first. Use getItinerary cost target ids: Arrival travel is kind arrival, Return travel is kind departure, destination_transfer is kind destination, activity_transfer is kind activity.',
    execute: async (toolCtx, input) => {
      const tripId = requestedTripId(input.tripId, activeTripId);
      const context: TripAssistantContext = await toolCtx.runQuery(
        internal.modules.assistant.model.index.tripContext,
        { tripId }
      );
      assertDraftProposal(context);
      const target =
        input.kind === 'arrival' || input.kind === 'departure'
          ? {
              kind: input.kind,
              transferId: input.transferId as Id<'tripBoundaryTransfers'>
            }
          : input.kind === 'destination'
            ? {
                kind: 'destination' as const,
                transferId: input.transferId as Id<'tripDestinationTransfers'>
              }
            : {
                kind: 'activity' as const,
                transferId: input.transferId as Id<'tripActivityTransfers'>
              };
      await toolCtx.runMutation(internal.modules.assistant.model.writes.removeTransfer, {
        target,
        tripId
      });
      return { kind: input.kind, removed: true as const, transferId: input.transferId };
    },
    inputSchema: z.object({
      kind: z.enum(['activity', 'arrival', 'departure', 'destination']),
      transferId: z.string().describe('An exact transfer id from getItinerary cost targets.'),
      tripId: z
        .string()
        .optional()
        .describe(
          'The exact workingTripId returned by startTripVersion. Never use the shared trip id.'
        )
    })
  });
}
