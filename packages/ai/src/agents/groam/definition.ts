import { defineChatAgent } from '#ai/agents/definition';
import { capabilitiesForAgent } from '#ai/tools/specs';

export const groamAgent = defineChatAgent({
  capabilities: capabilitiesForAgent('groam'),
  description: 'Coordinates travel planning, workspace context, research, and authorized actions.',
  id: 'groam',
  identity: 'You are Groam’s single screen-aware travel companion.',
  label: 'Groam'
});
