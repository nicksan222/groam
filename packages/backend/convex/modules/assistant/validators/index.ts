import {
  assistantAgentIds,
  assistantCapabilityIds,
  chatAgentIds,
  issueAssignableAgentIds,
  proposalAssignableAgentIds
} from '@groam/ai-contracts/agents/registry';
import {
  agentRunEventKindIds,
  agentRunKickoffIds,
  agentRunStatusIds,
  agentSurfaceIds
} from '@groam/ai-contracts/agents/runs/ids';
import { type Infer, v } from 'convex/values';

function literals<T extends string>(values: readonly T[]) {
  const [first, second, ...rest] = values;
  if (first === undefined) throw new Error('Expected at least one literal');
  if (second === undefined) return v.literal(first);
  return v.union(v.literal(first), v.literal(second), ...rest.map((value) => v.literal(value)));
}

const capabilityLiterals = assistantCapabilityIds.map((capability) => v.literal(capability));
const capabilityValidator = v.union(
  ...(capabilityLiterals as [
    (typeof capabilityLiterals)[number],
    (typeof capabilityLiterals)[number],
    ...(typeof capabilityLiterals)[number][]
  ])
);

export const assistantAgentValidator = literals(assistantAgentIds);
export const chatAgentValidator = literals(chatAgentIds);
export const issueAssignableAgentValidator = literals(issueAssignableAgentIds);
export const proposalAssignableAgentValidator = literals(proposalAssignableAgentIds);

export const agentSurfaceValidator = literals(agentSurfaceIds);
export const agentRunStatusValidator = literals(agentRunStatusIds);
export const agentRunKickoffValidator = literals(agentRunKickoffIds);
export const agentRunEventKindValidator = literals(agentRunEventKindIds);

export const issueAgentActorValidator = v.object({
  agentId: issueAssignableAgentValidator,
  kind: v.literal('agent'),
  name: v.string()
});
export const proposalAgentActorValidator = v.object({
  agentId: proposalAssignableAgentValidator,
  kind: v.literal('agent'),
  name: v.string()
});

const tripSectionValidator = v.union(
  v.literal('activity'),
  v.literal('ideas'),
  v.literal('issues'),
  v.literal('itinerary'),
  v.literal('overview'),
  v.literal('versions')
);

export const assistantScreenValidator = v.object({
  capabilities: v.array(capabilityValidator),
  data: v.string(),
  description: v.string(),
  key: v.string(),
  target: v.union(
    v.object({ kind: v.literal('workspace') }),
    v.object({
      kind: v.literal('trip'),
      section: tripSectionValidator,
      tripId: v.id('trips')
    })
  ),
  title: v.string()
});

export type AssistantScreen = Infer<typeof assistantScreenValidator>;
export type AgentRunStatus = Infer<typeof agentRunStatusValidator>;
export type AgentSurface = Infer<typeof agentSurfaceValidator>;
