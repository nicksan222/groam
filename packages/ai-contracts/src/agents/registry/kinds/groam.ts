import { assistantCapabilityIds } from '#ai-contracts/agents/registry/ids';
import { defineChatAgent } from '#ai-contracts/agents/registry/kind';

export const groamAgent = defineChatAgent({
  capabilities: assistantCapabilityIds,
  description: 'Coordinates travel planning, workspace context, research, and authorized actions.',
  id: 'groam',
  identity: 'You are Groam’s single screen-aware travel companion.',
  label: 'Groam'
});
