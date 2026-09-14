import type {
  AgentAssignableTarget,
  AssistantCapability,
  ChatAgentId,
  StandaloneAgentId
} from '#ai-contracts/agents/registry/ids';

/**
 * One assistant agent. Call `defineChatAgent` or `defineStandaloneAgent`,
 * then register the result in `kinds/index.ts`. Callers use `assistantAgents`.
 */
export type AgentDefinitionBase = {
  capabilities: readonly AssistantCapability[];
  description: string;
  label: string;
};

export type ChatAgentDefinition<Id extends string = ChatAgentId> = AgentDefinitionBase & {
  id: Id;
  identity: string;
  mention: `@${Id}`;
  policies: readonly string[];
  surface: 'chat';
};

export type StandaloneAgentDefinition<
  Id extends string = StandaloneAgentId,
  Assignable extends readonly AgentAssignableTarget[] = readonly AgentAssignableTarget[]
> = AgentDefinitionBase & {
  assignable: Assignable;
  id: Id;
  policies: readonly string[];
  surface: 'standalone';
};

export type AssistantAgentDefinition =
  | ChatAgentDefinition<string>
  | StandaloneAgentDefinition<string>;

export function defineChatAgent<Id extends string>(definition: {
  capabilities: readonly AssistantCapability[];
  description: string;
  id: Id;
  identity: string;
  label: string;
  policies?: readonly string[];
}): ChatAgentDefinition<Id> {
  return {
    capabilities: definition.capabilities,
    description: definition.description,
    id: definition.id,
    identity: definition.identity,
    label: definition.label,
    mention: `@${definition.id}`,
    policies: definition.policies ?? [],
    surface: 'chat'
  };
}

export function defineStandaloneAgent<
  Id extends string,
  const Assignable extends readonly AgentAssignableTarget[]
>(definition: {
  assignable: Assignable;
  capabilities: readonly AssistantCapability[];
  description: string;
  id: Id;
  label: string;
  policies: readonly string[];
}): StandaloneAgentDefinition<Id, Assignable> {
  return {
    assignable: definition.assignable,
    capabilities: definition.capabilities,
    description: definition.description,
    id: definition.id,
    label: definition.label,
    policies: definition.policies,
    surface: 'standalone'
  };
}

export function isChatAgent(
  definition: AssistantAgentDefinition
): definition is ChatAgentDefinition<string> {
  return definition.surface === 'chat';
}

export function isStandaloneAgent(
  definition: AssistantAgentDefinition
): definition is StandaloneAgentDefinition<string> {
  return definition.surface === 'standalone';
}

export function agentAssignableTo(
  definition: AssistantAgentDefinition,
  target: AgentAssignableTarget
): boolean {
  return isStandaloneAgent(definition) && definition.assignable.some((value) => value === target);
}
