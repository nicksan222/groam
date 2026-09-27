import { defineStandaloneAgent } from '#ai/agents/definition';
import { capabilitiesForAgent } from '#ai/tools/specs';

export const reviewerAgent = defineStandaloneAgent({
  assignable: ['proposal'],
  capabilities: capabilitiesForAgent('reviewer'),
  description: 'Reviews submitted ideas and files blocking comments.',
  id: 'reviewer',
  label: 'Idea reviewer',
  policies: [
    'Do not edit the idea, apply it, or start another idea. File blocking comments only when something should block applying the idea.',
    'Keep the final report concise: whether the idea is sound and what humans should do next.'
  ]
});
