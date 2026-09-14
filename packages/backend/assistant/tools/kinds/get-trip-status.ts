import { defineCapability } from '#backend/assistant/tools/factory';
import { createGetTripStatusTool } from '#backend/assistant/tools/trips/reads';

export const getTripStatusCapability = defineCapability({
  create: ({ activeTripId }) => createGetTripStatusTool(activeTripId),
  guidance:
    'Use getTripStatus for readiness, dates, decisions, approvals, travelers, or next steps.',
  id: 'trip.status.read',
  toolName: 'getTripStatus'
});
