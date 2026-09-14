import { assistantAgents, isChatAgent } from '#ai-contracts/agents/registry/definitions';
import { type ChatAgentId, isAssistantAgentId } from '#ai-contracts/agents/registry/ids';
import {
  type AssistantContextTag,
  isRecord,
  parseAssistantContextTag
} from '#ai-contracts/agents/registry/shared';

export type AssistantContextSnapshot = {
  agent: ChatAgentId;
  key: string;
  tags: AssistantContextTag[];
  target: { kind: 'workspace' } | { kind: 'trip'; section: string; tripId: string };
  title: string;
};

const CONTEXT_MESSAGE_PREFIX = 'Groam interaction context (JSON):\n';
const LEGACY_CONTEXT_MESSAGE_PREFIX = 'Groam screen context snapshot (JSON):\n';

export function assistantContextMessage(snapshot: AssistantContextSnapshot): string {
  return `${CONTEXT_MESSAGE_PREFIX}${JSON.stringify(snapshot)}`;
}

export function parseAssistantContextMessage(message: string): AssistantContextSnapshot | null {
  const prefix = message.startsWith(CONTEXT_MESSAGE_PREFIX)
    ? CONTEXT_MESSAGE_PREFIX
    : message.startsWith(LEGACY_CONTEXT_MESSAGE_PREFIX)
      ? LEGACY_CONTEXT_MESSAGE_PREFIX
      : null;
  if (!prefix) return null;
  try {
    const value: unknown = JSON.parse(message.slice(prefix.length));
    if (!isRecord(value)) return null;
    const { agent, key, target, title } = value;
    const rawTags = value.tags ?? [];
    if (
      typeof agent !== 'string' ||
      !isAssistantAgentId(agent) ||
      typeof key !== 'string' ||
      !Array.isArray(rawTags) ||
      !isRecord(target) ||
      typeof title !== 'string'
    ) {
      return null;
    }
    const parsedTags = rawTags.map(parseAssistantContextTag);
    if (parsedTags.some((tag) => tag === null)) return null;
    const parsedTarget =
      target.kind === 'workspace'
        ? ({ kind: 'workspace' } as const)
        : target.kind === 'trip' &&
            typeof target.section === 'string' &&
            typeof target.tripId === 'string'
          ? ({ kind: 'trip', section: target.section, tripId: target.tripId } as const)
          : null;
    if (!parsedTarget) return null;
    const definition = assistantAgents[agent];
    if (!isChatAgent(definition)) return null;
    return {
      agent: definition.id,
      key,
      tags: parsedTags as AssistantContextTag[],
      target: parsedTarget,
      title
    };
  } catch {
    return null;
  }
}
