import type { UIMessage } from '@convex-dev/agent/react';
import { parseAssistantToolActivity } from '#ai/agents';
import { catalogToolLabel } from '#ai/backend/runs';
import { cardForToolName } from '#ai/tools/specs';
import { ActivityToolCall } from '#ai/ui/tool-calls/activity-tool-call';
import type {
  ActivityPresentation,
  ChoicePresentation,
  ToolCallStrategy,
  ToolPart,
  ToolPresentation,
  ToolStatus
} from '#ai/ui/tool-calls/assistant-tool-call-types';
import { ChoiceToolCall } from '#ai/ui/tool-calls/choice-tool-call';

const choiceStrategy: ToolCallStrategy = {
  Component: ChoiceToolCall,
  present: choicePresentation
};

const activityStrategy: ToolCallStrategy = {
  Component: ActivityToolCall,
  present: (part, toolName, settled) => activityPresentation(part, toolName, settled)
};

/** Visible tool-call cards for a message's parts, deduplicated, in call order. */
export function toolCallPresentations(
  parts: UIMessage['parts'],
  {
    kind,
    settled = false,
    suppressChoices = false
  }: { kind?: 'activity' | 'choice'; settled?: boolean; suppressChoices?: boolean } = {}
) {
  return deduplicatePresentations(
    parts.flatMap((part) => {
      const toolName = toolNameFromPart(part);
      const card = toolName ? cardForToolName(toolName) : 'hidden';
      const cardKind = card === 'choice' ? 'choice' : 'activity';
      if (
        !toolName ||
        card === 'hidden' ||
        (suppressChoices && card === 'choice') ||
        (kind && kind !== cardKind)
      ) {
        return [];
      }
      const strategy = card === 'choice' ? choiceStrategy : activityStrategy;
      const presentation = strategy.present(part, toolName, settled);
      return presentation ? [{ presentation, strategy }] : [];
    })
  );
}

function deduplicatePresentations(
  calls: Array<{ presentation: ToolPresentation; strategy: ToolCallStrategy }>
) {
  const unique = new Map<string, (typeof calls)[number]>();
  for (const call of calls) {
    const { presentation } = call;
    const identity =
      presentation.kind === 'activity'
        ? `activity:${presentation.semanticId}:${presentation.status}`
        : `choice:${presentation.key}`;
    unique.set(identity, call);
  }
  return [...unique.values()];
}

function toolNameFromPart(part: ToolPart): string | null {
  if (part.type.startsWith('tool-')) return part.type.slice('tool-'.length);
  if (part.type === 'dynamic-tool' && 'toolName' in part && typeof part.toolName === 'string') {
    return part.toolName;
  }
  return null;
}

function activityPresentation(
  part: ToolPart,
  toolIdOrName: string,
  settled = false
): ActivityPresentation {
  const status = toolStatus(part, settled);
  const receipt = parseAssistantToolActivity('output' in part ? part.output : undefined);
  const labels = catalogToolLabel(toolIdOrName);
  return {
    ...(receipt?.detail ? { detail: receipt.detail } : {}),
    key: toolCallKey(part, `${toolIdOrName}:${status}`),
    kind: 'activity',
    label: activityLabel(status, labels, receipt?.label),
    semanticId: receipt?.id ?? toolIdOrName,
    status
  };
}

function toolStatus(part: ToolPart, settled: boolean): ToolStatus {
  const state = 'state' in part && typeof part.state === 'string' ? part.state : '';
  if (state === 'output-error') return 'error';
  if (!state.startsWith('input-')) return 'complete';
  // A call with no result on a finished message never will get one (provider error, timeout, Stop).
  return settled ? 'stopped' : 'running';
}

function toolCallKey(part: ToolPart, fallback: string): string {
  return 'toolCallId' in part && typeof part.toolCallId === 'string' ? part.toolCallId : fallback;
}

function activityLabel(
  status: ToolStatus,
  labels: { complete: string; running: string },
  receiptLabel?: string
): string {
  if (status === 'stopped') return `Didn’t finish ${labels.running.toLocaleLowerCase()}`;
  if (status === 'error') return `Failed while ${labels.running.toLocaleLowerCase()}`;
  if (status === 'running') return labels.running;
  return receiptLabel ?? labels.complete;
}

function choicePresentation(part: ToolPart): ChoicePresentation | null {
  if (!('input' in part)) return null;
  const input: unknown = part.input;
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return null;
  const { options, question } = input as Record<string, unknown>;
  if (
    typeof question !== 'string' ||
    !Array.isArray(options) ||
    !options.every((option) => typeof option === 'string')
  ) {
    return null;
  }
  return {
    key: toolCallKey(part, `choice:${question}`),
    kind: 'choice',
    options,
    question
  };
}
