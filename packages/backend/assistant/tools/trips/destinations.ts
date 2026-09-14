import { createTool } from '@convex-dev/agent';
import { ConvexError } from 'convex/values';
import * as z from 'zod/v3';
import { assertDraftProposal, requestedTripId } from '#backend/assistant/tools/trips/shared';
import type { TripAssistantContext } from '#convex/modules/assistant/model/index';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';

export function createAddDestinationTool(activeTripId: Id<'trips'> | null) {
  return createTool({
    description:
      'Add a verified stop to a DRAFT idea. Call startTripVersion first and pass its workingTripId. Requires a real placeId plus coordinates from research — never invent them. Optional startDay and endDay grow trip length when needed.',
    execute: async (toolCtx, input) => {
      const tripId = requestedTripId(input.tripId, activeTripId);
      const context: TripAssistantContext = await toolCtx.runQuery(
        internal.modules.assistant.model.index.tripContext,
        { tripId }
      );
      assertDraftProposal(context);
      if ((input.startDay === undefined) !== (input.endDay === undefined)) {
        throw new ConvexError('Provide both startDay and endDay, or omit both');
      }
      const destinationId: Id<'tripDestinations'> = await toolCtx.runMutation(
        internal.modules.assistant.model.writes.addDestination,
        {
          input: {
            coordinates: { latitude: input.latitude, longitude: input.longitude },
            ...(input.countryCode ? { countryCode: input.countryCode } : {}),
            ...(input.dayNotes ? { dayNotes: input.dayNotes } : {}),
            name: input.name,
            placeId: input.placeId,
            ...(input.startDay === undefined || input.endDay === undefined
              ? {}
              : { schedule: { endDay: input.endDay, startDay: input.startDay } }),
            status: 'known' as const
          },
          tripId
        }
      );
      return { destinationId, name: input.name.trim() };
    },
    inputSchema: z.object({
      countryCode: z
        .string()
        .length(2)
        .optional()
        .describe('ISO 3166-1 alpha-2 country code, such as PT or TH.'),
      dayNotes: z.string().max(240).optional(),
      endDay: z.number().int().min(1).max(365).optional(),
      latitude: z.number().min(-90).max(90).describe('Verified latitude for this place.'),
      longitude: z.number().min(-180).max(180).describe('Verified longitude for this place.'),
      name: z.string().min(1).max(120).describe('The destination name travelers will see.'),
      placeId: z
        .string()
        .min(1)
        .max(120)
        .describe('A verified place identifier from research. Never invent this.'),
      startDay: z.number().int().min(1).max(365).optional(),
      tripId: z
        .string()
        .optional()
        .describe(
          'The exact workingTripId returned by startTripVersion. Never use the shared trip id.'
        )
    })
  });
}

export function createSetDestinationScheduleTool(activeTripId: Id<'trips'> | null) {
  return createTool({
    description:
      'Set a stop’s start and end days on a DRAFT idea. Grows trip length when the new last day is beyond the current trip. Call startTripVersion first and pass its workingTripId plus an idea-specific destination id.',
    execute: async (toolCtx, input) => {
      const tripId = requestedTripId(input.tripId, activeTripId);
      const context: TripAssistantContext = await toolCtx.runQuery(
        internal.modules.assistant.model.index.tripContext,
        { tripId }
      );
      assertDraftProposal(context);
      const destination = context.destinations.find(
        (candidate) => candidate.id === input.destinationId
      );
      if (!destination) throw new ConvexError('That destination is not on this idea');
      const scheduled: {
        endDay: number;
        startDay: number;
        totalDurationDays: number;
      } = await toolCtx.runMutation(
        internal.modules.assistant.model.writes.setDestinationSchedule,
        {
          ...(input.dayNotes === undefined ? {} : { dayNotes: input.dayNotes }),
          destinationId: destination.id,
          endDay: input.endDay,
          startDay: input.startDay,
          tripId
        }
      );
      return { ...scheduled, destinationId: destination.id };
    },
    inputSchema: z.object({
      dayNotes: z.string().max(240).optional(),
      destinationId: z.string().describe('An exact destination id returned by getItinerary.'),
      endDay: z.number().int().min(1).max(365),
      startDay: z.number().int().min(1).max(365),
      tripId: z
        .string()
        .optional()
        .describe(
          'The exact workingTripId returned by startTripVersion. Never use the shared trip id.'
        )
    })
  });
}

export function createRemoveDestinationTool(activeTripId: Id<'trips'> | null) {
  return createTool({
    description:
      'Remove a stop from a DRAFT idea. Call startTripVersion first and pass its workingTripId plus an idea-specific destination id. This also removes that stop’s activities and stays.',
    execute: async (toolCtx, input) => {
      const tripId = requestedTripId(input.tripId, activeTripId);
      const context: TripAssistantContext = await toolCtx.runQuery(
        internal.modules.assistant.model.index.tripContext,
        { tripId }
      );
      assertDraftProposal(context);
      const destination = context.destinations.find(
        (candidate) => candidate.id === input.destinationId
      );
      if (!destination) throw new ConvexError('That destination is not on this idea');
      await toolCtx.runMutation(internal.modules.assistant.model.writes.removeDestination, {
        destinationId: destination.id,
        tripId
      });
      return { destinationId: destination.id, removed: true as const };
    },
    inputSchema: z.object({
      destinationId: z.string().describe('An exact destination id returned by getItinerary.'),
      tripId: z
        .string()
        .optional()
        .describe(
          'The exact workingTripId returned by startTripVersion. Never use the shared trip id.'
        )
    })
  });
}
