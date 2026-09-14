import {
  type AgentAssignableTarget,
  assistantAgentIds,
  type ChatAgentId,
  chatAgentIds,
  type StandaloneAgentId,
  standaloneAgentIds
} from '#ai-contracts/agents/registry/ids';
import type {
  ChatAgentDefinition,
  StandaloneAgentDefinition
} from '#ai-contracts/agents/registry/kind';
import { groamAgent } from '#ai-contracts/agents/registry/kinds/groam';
import { issueAgent } from '#ai-contracts/agents/registry/kinds/issue';
import { reviewerAgent } from '#ai-contracts/agents/registry/kinds/reviewer';

/**
 * Register every assistant agent here. To add one:
 * 1. Add the id to `chatAgentIds` or `standaloneAgentIds` in `ids.ts`
 * 2. Create `kinds/<id>.ts` with `defineChatAgent` or `defineStandaloneAgent`
 * 3. Add it to `assistantAgents` below
 */
export const assistantAgents = {
  groam: groamAgent,
  issue: issueAgent,
  reviewer: reviewerAgent
} as const satisfies { [Id in ChatAgentId]: ChatAgentDefinition<Id> } & {
  [Id in StandaloneAgentId]: StandaloneAgentDefinition<Id>;
};

export const assistantAgentList = assistantAgentIds.map((id) => assistantAgents[id]);

const registered = new Set(Object.keys(assistantAgents));
for (const id of assistantAgentIds) {
  if (!registered.has(id)) {
    throw new Error(`Assistant agent '${id}' must be registered in kinds/index.ts`);
  }
}

type AgentIdAssignableTo<Target extends AgentAssignableTarget> = {
  [Id in StandaloneAgentId]: Target extends (typeof assistantAgents)[Id]['assignable'][number]
    ? Id
    : never;
}[StandaloneAgentId];

function idsAssignableTo<Target extends AgentAssignableTarget>(
  target: Target
): readonly [AgentIdAssignableTo<Target>, ...AgentIdAssignableTo<Target>[]] {
  const ids = standaloneAgentIds.filter((id): id is AgentIdAssignableTo<Target> =>
    (assistantAgents[id].assignable as readonly AgentAssignableTarget[]).includes(target)
  );
  const [first, ...rest] = ids;
  if (first === undefined) {
    throw new Error(`No standalone agent is assignable to ${target}`);
  }
  return [first, ...rest];
}

export const issueAssignableAgentIds = idsAssignableTo('issue');
export const proposalAssignableAgentIds = idsAssignableTo('proposal');

export function isIssueAssignableAgentId(
  value: string
): value is (typeof issueAssignableAgentIds)[number] {
  return issueAssignableAgentIds.some((id) => id === value);
}

export function isProposalAssignableAgentId(
  value: string
): value is (typeof proposalAssignableAgentIds)[number] {
  return proposalAssignableAgentIds.some((id) => id === value);
}

export const assistantChatDefaultTitle = 'New AI chat';

export function isDefaultAssistantChatTitle(title: string | null): boolean {
  return title === assistantChatDefaultTitle || title === 'New chat';
}

const chatAgentList = chatAgentIds.map((id) => assistantAgents[id]);

function hasMentionAtBoundary(prompt: string, mention: string): boolean {
  const lower = prompt.toLowerCase();
  const needle = mention.toLowerCase();
  for (let index = 0; index <= lower.length - needle.length; index += 1) {
    if (!lower.startsWith(needle, index)) continue;
    const beforeOk = index === 0 || /\s/u.test(lower[index - 1] ?? '');
    const afterIndex = index + needle.length;
    const afterOk = afterIndex === lower.length || /\s/u.test(lower[afterIndex] ?? '');
    if (beforeOk && afterOk) return true;
  }
  return false;
}

export function mentionedAssistantAgent(
  prompt: string
): (typeof assistantAgents)[ChatAgentId] | null {
  for (const agent of chatAgentList) {
    if (hasMentionAtBoundary(prompt, agent.mention)) return agent;
  }
  return null;
}
