import { createTool } from '@convex-dev/agent';
import * as z from 'zod/v3';
import { requestedTripId } from '#backend/assistant/tools/trips/shared';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';

export function createApplyTripVersionTool() {
  return createTool({
    description:
      'Apply an approved trip idea to the shared trip. Use this only after required human approvals. If Git cannot auto-merge, the idea is marked conflicted instead of changing the shared trip.',
    execute: async (toolCtx, input) => {
      const status = await toolCtx.runAction(internal.modules.travel.versions.merge.action.apply, {
        proposalId: input.proposalId as Id<'tripProposals'>
      });
      return { proposalId: input.proposalId, status };
    },
    inputSchema: z.object({
      proposalId: z.string().describe('The idea / proposal id to apply to the shared trip.')
    })
  });
}

export function createApproveTripVersionTool() {
  return createTool({
    description:
      'Record the current traveler’s approval or withdraw it for an idea that is already in review. Idea authors cannot approve their own changes when independent human reviewers were requested; otherwise self-approval is allowed.',
    execute: async (toolCtx, input) => {
      await toolCtx.runMutation(internal.modules.assistant.model.proposals.setTripVersionApproval, {
        approved: input.approved,
        proposalId: input.proposalId as Id<'tripProposals'>
      });
      return {
        approved: input.approved,
        proposalId: input.proposalId
      };
    },
    inputSchema: z.object({
      approved: z.boolean().describe('True to approve, false to withdraw approval.'),
      proposalId: z.string().describe('The idea / proposal id to approve.')
    })
  });
}

export function createSetTravelerRsvpTool(activeTripId: Id<'trips'> | null) {
  return createTool({
    description:
      'Set a traveler RSVP on the shared trip: going, maybe, or not going. Defaults to the current traveler. Only organizers can change someone else’s RSVP.',
    execute: async (toolCtx, input) => {
      const tripId = requestedTripId(input.tripId, activeTripId);
      await toolCtx.runMutation(internal.modules.assistant.model.proposals.setTravelerRsvp, {
        status: input.status,
        tripId,
        ...(input.userId ? { userId: input.userId } : {})
      });
      return { status: input.status, tripId, userId: input.userId ?? null };
    },
    inputSchema: z.object({
      status: z.enum(['going', 'maybe', 'not_going']).describe('going, maybe, or not_going.'),
      tripId: z.string().optional().describe('The shared trip id. Omit for the active trip.'),
      userId: z
        .string()
        .optional()
        .describe('Workspace member user id. Omit to update the current traveler.')
    })
  });
}
