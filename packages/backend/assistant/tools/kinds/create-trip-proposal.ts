import { defineCapability } from '#backend/assistant/tools/factory';
import { createTripProposalTool } from '#backend/assistant/tools/trips/proposal';

export const createTripProposalCapability = defineCapability({
  create: ({ scope, threadId }) =>
    scope === 'standalone' || !threadId ? null : createTripProposalTool(threadId, scope),
  guidance:
    'Call createTripProposal only after the traveler explicitly asks to create a trip and its name is clear.',
  id: 'trip.create',
  toolName: 'createTripProposal',
  writeIntent: ['build', 'create', 'make', 'start']
});
