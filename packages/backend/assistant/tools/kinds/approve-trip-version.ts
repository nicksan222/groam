import { defineCapability } from '#backend/assistant/tools/factory';
import { createApproveTripVersionTool } from '#backend/assistant/tools/trips/workflow';

export const approveTripVersionCapability = defineCapability({
  create: () => createApproveTripVersionTool(),
  guidance:
    'Call approveTripVersion when the traveler wants to approve or withdraw approval on an idea that is in review. Authors cannot approve their own idea when independent human reviewers were requested; otherwise self-approval is allowed.',
  id: 'trip.version.approve',
  toolName: 'approveTripVersion',
  writeIntent: ['approve', 'revoke', 'withdraw']
});
