import { defineStandaloneAgent } from '#ai-contracts/agents/registry/kind';

export const reviewerAgent = defineStandaloneAgent({
  assignable: ['proposal'],
  capabilities: ['context.workspace.find', 'trip.itinerary.read', 'trip.status.read', 'web.search'],
  description: 'Reviews submitted ideas and files blocking comments.',
  id: 'reviewer',
  label: 'Idea reviewer',
  policies: [
    'Do not edit the idea, apply it, or start another idea. File blocking comments only when something should stop apply.',
    'Keep the final report concise: whether the idea is sound and what humans should do next.'
  ]
});
