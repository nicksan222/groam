import { type AssistantAgentDefinition, agentAssignableTo } from '#ai/agents/definition';
import { groamAgent } from '#ai/agents/groam/definition';
import type { AgentAssignableTarget, AssistantAgentId } from '#ai/agents/ids';
import { issueAgent } from '#ai/agents/issue/definition';
import { reviewerAgent } from '#ai/agents/reviewer/definition';
import { assistantToolSpecs, type AssistantCapability as SpecCapability } from '#ai/tools/specs';

/**
 * The single source of truth for assistant agents.
 *
 * Agent ids and assignable targets are declared in `agents/ids.ts`; the map
 * below must satisfy that roster or compilation fails. To add an agent:
 * extend the roster, create `agents/<id>/definition.ts`, then add one line
 * to `assistantAgents`. Agent UI lives in `#ai/ui/*` directly. Id lists, the
 * definition list, guards, capability catalog, and mention parsing all derive
 * from this map plus the tool specs — do not maintain a parallel list
 * anywhere else.
 */
export const assistantAgents = {
  groam: groamAgent,
  issue: issueAgent,
  reviewer: reviewerAgent
} as const satisfies Record<AssistantAgentId, AssistantAgentDefinition>;

export type { AssistantAgentId };

export type ChatAgentId = {
  [Id in AssistantAgentId]: (typeof assistantAgents)[Id]['surface'] extends 'chat' ? Id : never;
}[AssistantAgentId];

type StandaloneAgentId = Exclude<AssistantAgentId, ChatAgentId>;

export const assistantAgentIds = Object.keys(assistantAgents) as AssistantAgentId[];

export const chatAgentIds = assistantAgentIds.filter(
  (id): id is ChatAgentId => assistantAgents[id].surface === 'chat'
);

const standaloneAgentIds = assistantAgentIds.filter(
  (id): id is StandaloneAgentId => assistantAgents[id].surface === 'standalone'
);

export const assistantAgentList = assistantAgentIds.map((id) => assistantAgents[id]);

export function isAssistantAgentId(value: string): value is AssistantAgentId {
  return (assistantAgentIds as readonly string[]).includes(value);
}

/** Tool capabilities an assistant agent is allowed to use, derived from the tool spec keys. */
export type AssistantCapability = SpecCapability;

export const assistantCapabilityIds = Object.keys(assistantToolSpecs) as AssistantCapability[];

export type AssistantToolActivityReceiptId = `${AssistantCapability}.done`;

export function assistantCapabilityReceipt(
  id: AssistantCapability
): AssistantToolActivityReceiptId {
  return `${id}.done`;
}

/**
 * Places a standalone (non-chat) agent can be assigned to. Declared in
 * `agents/ids.ts`; every standalone definition's `assignable` list is
 * constrained to it, and `idsAssignableTo` below throws at startup when a
 * target has no agent.
 */
type AgentIdAssignableTo<Target extends AgentAssignableTarget> = {
  [Id in StandaloneAgentId]: Target extends (typeof assistantAgents)[Id]['assignable'][number]
    ? Id
    : never;
}[StandaloneAgentId];

function idsAssignableTo<Target extends AgentAssignableTarget>(
  target: Target
): readonly [AgentIdAssignableTo<Target>, ...AgentIdAssignableTo<Target>[]] {
  const ids = standaloneAgentIds.filter((id): id is AgentIdAssignableTo<Target> =>
    agentAssignableTo(assistantAgents[id], target)
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

function isMentionStart(lower: string, index: number): boolean {
  if (index === 0) return true;
  // A word character before the mention means an address like
  // `email@groam.com`, not a mention.
  return /[\s([{,.;:!?]/u.test(lower[index - 1] ?? '');
}

function isMentionEnd(lower: string, end: number): boolean {
  const next = lower[end];
  if (next === undefined || /[\s,;:!?)\]}]/u.test(next)) return true;
  // Sentence-final period ("ask @groam.") without matching "@groam.com".
  return next === '.' && (lower[end + 1] === undefined || /\s/u.test(lower[end + 1] ?? ''));
}

function hasMentionAtBoundary(prompt: string, mention: string): boolean {
  const lower = prompt.toLowerCase();
  const needle = mention.toLowerCase();
  for (let index = 0; index <= lower.length - needle.length; index += 1) {
    if (!lower.startsWith(needle, index)) continue;
    if (isMentionStart(lower, index) && isMentionEnd(lower, index + needle.length)) return true;
  }
  return false;
}

const chatAgentList = chatAgentIds.map((id) => assistantAgents[id]);

/**
 * Finds a chat agent `@mention`ed in a prompt. Matches whole tokens only, so
 * `email@groam.com` is not a mention. Standalone agents have no mention and
 * never match.
 */
export function mentionedAssistantAgent(
  prompt: string
): (typeof assistantAgents)[ChatAgentId] | null {
  for (const agent of chatAgentList) {
    if (hasMentionAtBoundary(prompt, agent.mention)) return agent;
  }
  return null;
}

/** Default title for a fresh assistant chat, and the legacy title it replaced. */
export const assistantChatDefaultTitle = 'New AI chat';

export function isDefaultAssistantChatTitle(title: string | null): boolean {
  return title === assistantChatDefaultTitle || title === 'New chat';
}
