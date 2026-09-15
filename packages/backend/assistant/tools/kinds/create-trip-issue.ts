import { defineCapability } from '#backend/assistant/tools/factory';
import { createTripIssueTool } from '#backend/assistant/tools/trips/issue';

export const createTripIssueCapability = defineCapability({
  create: ({ activeTripId }) => createTripIssueTool(activeTripId),
  guidance:
    'Use createTripIssue when the traveler wants to capture planning work for the Issue agent without implementing it yet. Issues queue standalone work; implementations belong in trip ideas.',
  id: 'trip.issue.create',
  toolName: 'createTripIssue',
  writeIntent: ['assign', 'create issue', 'file issue', 'open issue', 'track']
});
