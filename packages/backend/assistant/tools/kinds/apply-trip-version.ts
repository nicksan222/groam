import { defineCapability } from '#backend/assistant/tools/factory';
import { createApplyTripVersionTool } from '#backend/assistant/tools/trips/workflow';

export const applyTripVersionCapability = defineCapability({
  create: () => createApplyTripVersionTool(),
  guidance:
    'Call applyTripVersion only after the traveler asks to apply or merge an approved idea into the shared trip. If the idea is still a draft, tell them it needs review and approvals first.',
  id: 'trip.version.apply',
  toolName: 'applyTripVersion',
  writeIntent: [
    'apply',
    'apply the idea',
    'apply this idea',
    'merge',
    'go ahead and merge',
    'please merge'
  ]
});
