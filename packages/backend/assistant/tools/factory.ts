import type { AssistantAgentId } from '@groam/ai/agents';
import type { AssistantConversationScope } from '@groam/ai/backend/instructions';
import type { AgentToolSpec } from '@groam/ai/tools/specs';
import type { ToolSet } from 'ai';
import type { AssistantScreen } from '#convex/modules/assistant/screen/index';
import type { Id } from '#convex-generated/dataModel';

export type AssistantTool = NonNullable<ToolSet[string]>;

export type AssistantToolScope = AssistantConversationScope;

export type AssistantToolRuntime = {
  activeTripId: Id<'trips'> | null;
  agentId: AssistantAgentId;
  prompt: string;
  screen: AssistantScreen;
  scope: AssistantToolScope;
  issueId?: Id<'tripIssues'>;
  providerTools?: ToolSet;
  runId?: Id<'agentRuns'>;
  threadId?: string;
};

/**
 * A tool spec from `@groam/ai` plus its Convex-bound constructor. Spec fields
 * (names, guidance, intents, run-log copy) live in the ai package — do not
 * redeclare them here.
 */
export type AssistantCapabilityRegistration = AgentToolSpec &
  (
    | { create: (runtime: AssistantToolRuntime) => AssistantTool | null; createToolSet?: never }
    | { create?: never; createToolSet: (runtime: AssistantToolRuntime) => ToolSet | null }
  );

export function defineCapability<T extends AssistantCapabilityRegistration>(registration: T): T {
  return registration;
}
