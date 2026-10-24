import type { AgentAssignableTarget } from '#ai/agents/ids';
import type { AssistantCapability } from '#ai/tools/specs';

/**
 * What an assistant agent is: identity, surface, and allowed tools.
 *
 * Each agent is defined once with `defineChatAgent` / `defineStandaloneAgent`
 * in `agents/<id>/definition.ts` and listed in `agents/catalog.ts`. Agent ids
 * and assignable targets are declared in `agents/ids.ts` (TypeScript cannot
 * infer the catalog and the tool specs from each other); everything else —
 * mentions, guards, capability lists — derives from the catalog, so there is
 * no other parallel list to keep in sync.
 */
export type AgentDefinitionBase = {
  capabilities: readonly AssistantCapability[];
  description: string;
  label: string;
};

export type ChatAgentDefinition<Id extends string = string> = AgentDefinitionBase & {
  id: Id;
  identity: string;
  mention: `@${Id}`;
  policies: readonly string[];
  surface: 'chat';
};

export type StandaloneAgentDefinition<
  Id extends string = string,
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

export type DefineChatAgentInput<Id extends string> = {
  capabilities: readonly AssistantCapability[];
  description: string;
  id: Id;
  identity: string;
  label: string;
  policies?: readonly string[];
};

export type DefineStandaloneAgentInput<
  Id extends string,
  Assignable extends readonly AgentAssignableTarget[]
> = {
  assignable: Assignable;
  capabilities: readonly AssistantCapability[];
  description: string;
  id: Id;
  label: string;
  policies: readonly string[];
};

export function defineChatAgent<Id extends string>(
  definition: DefineChatAgentInput<Id>
): ChatAgentDefinition<Id> {
  return {
    ...definition,
    mention: `@${definition.id}`,
    policies: definition.policies ?? [],
    surface: 'chat'
  };
}

export function defineStandaloneAgent<
  Id extends string,
  const Assignable extends readonly AgentAssignableTarget[]
>(
  definition: DefineStandaloneAgentInput<Id, Assignable>
): StandaloneAgentDefinition<Id, Assignable> {
  return { ...definition, surface: 'standalone' };
}

export function isChatAgent(
  definition: AssistantAgentDefinition
): definition is ChatAgentDefinition<string> {
  return definition.surface === 'chat';
}

export function agentAssignableTo(
  definition: AssistantAgentDefinition,
  target: AgentAssignableTarget
): boolean {
  return (
    definition.surface === 'standalone' && definition.assignable.some((value) => value === target)
  );
}
