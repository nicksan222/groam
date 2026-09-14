import { isRecord } from '#ai-contracts/agents/registry/shared';
import { agentRunEventLabels } from '#ai-contracts/agents/runs/events';
import {
  type AgentRunToolEventDraft,
  toolEventFromResult,
  truncateJson
} from '#ai-contracts/agents/runs/tool-event';

export type AgentRunStepEventDraft =
  | { detail: string; kind: 'thought'; label: string }
  | (AgentRunToolEventDraft & { kind: 'tool' });

export type AgentRunStepSnapshot = {
  content?: unknown;
  reasoning?: unknown;
  reasoningText?: unknown;
  text?: unknown;
  toolCalls?: unknown;
  toolResults?: unknown;
};

function textFromUnknown(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (!Array.isArray(value)) return undefined;
  const parts = value.flatMap((part) => {
    if (!isRecord(part) || typeof part.text !== 'string') return [];
    const trimmed = part.text.trim();
    return trimmed.length > 0 ? [trimmed] : [];
  });
  if (parts.length === 0) return undefined;
  return parts.join('\n');
}

function reasoningFromContent(content: unknown): string | undefined {
  if (!Array.isArray(content)) return undefined;
  const parts = content.flatMap((part) => {
    if (!isRecord(part) || part.type !== 'reasoning' || typeof part.text !== 'string') {
      return [];
    }
    const trimmed = part.text.trim();
    return trimmed.length > 0 ? [trimmed] : [];
  });
  if (parts.length === 0) return undefined;
  return parts.join('\n');
}

function looksLikeJsonObject(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.startsWith('{') && trimmed.endsWith('}');
}

function toolList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function thoughtFromStep(step: AgentRunStepSnapshot): string | undefined {
  const reasoning =
    textFromUnknown(step.reasoningText) ??
    textFromUnknown(step.reasoning) ??
    reasoningFromContent(step.content);
  if (reasoning) return truncateJson(reasoning);

  const text = textFromUnknown(step.text);
  if (!text) return undefined;
  const hasTools = toolList(step.toolCalls).length > 0 || toolList(step.toolResults).length > 0;
  if (!hasTools || looksLikeJsonObject(text)) return undefined;
  return truncateJson(text);
}

export function eventsFromStep(step: AgentRunStepSnapshot): AgentRunStepEventDraft[] {
  const events: AgentRunStepEventDraft[] = [];
  const thought = thoughtFromStep(step);
  if (thought) {
    events.push({
      detail: thought,
      kind: 'thought',
      label: agentRunEventLabels.thought
    });
  }
  for (const result of toolList(step.toolResults)) {
    events.push({
      kind: 'tool',
      ...toolEventFromResult(isRecord(result) ? result : {})
    });
  }
  return events;
}
