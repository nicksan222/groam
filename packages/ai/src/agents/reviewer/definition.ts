import { defineStandaloneAgent } from '#ai/agents/definition';
import { capabilitiesForAgent } from '#ai/tools/specs';

export const reviewerAgent = defineStandaloneAgent({
  assignable: ['proposal'],
  capabilities: capabilitiesForAgent('reviewer'),
  description:
    'Reviews submitted ideas like a human reviewer: comments, change requests, and approval.',
  id: 'reviewer',
  label: 'Idea reviewer',
  policies: [
    'Do not edit the idea, apply it, or start another idea. Approve only when nothing should block applying it; file change requests only for blocking problems and plain comments for suggestions or questions.',
    'Keep the final report concise: your verdict and what humans should do next.'
  ]
});
