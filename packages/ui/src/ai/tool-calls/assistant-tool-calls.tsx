import type { UIMessage } from '@convex-dev/agent/react';
import { parseAssistantToolActivity } from '@groam/ai-contracts/agents/registry';
import { conventionalToolLabel } from '@groam/ai-contracts/agents/runs';
import Timeline from '@groam/ui/components/timeline';
import { ActivityToolCall } from '#tsx/ai/tool-calls/activity-tool-call';
import { ChoiceToolCall } from '#tsx/ai/tool-calls/choice-tool-call';
import type {
  ActivityPresentation,
  ChoicePresentation,
  ToolCallStrategy,
  ToolPart,
  ToolPresentation,
  ToolStatus
} from './assistant-tool-call-types';

const choiceStrategy: ToolCallStrategy = {
  Component: ChoiceToolCall,
  present: choicePresentation
};

const activityStrategy: ToolCallStrategy = {
  Component: ActivityToolCall,
  present: (part, toolName) => activityPresentation(part, toolName)
};

export function AssistantToolCalls({
  disabled,
  onReply,
  parts,
  selectedChoices,
  suppressChoices = false
}: {
  disabled: boolean;
  onReply?: (prompt: string) => Promise<boolean>;
  parts: UIMessage['parts'];
  selectedChoices?: Record<string, string>;
  suppressChoices?: boolean;
}) {
  const calls = deduplicatePresentations(
    parts.flatMap((part) => {
      const toolName = toolNameFromPart(part);
      if (
        !toolName ||
        toolName === 'getScreenContext' ||
        (suppressChoices && toolName === 'askUserChoice')
      ) {
        return [];
      }
      const strategy = toolName === 'askUserChoice' ? choiceStrategy : activityStrategy;
      const presentation = strategy.present(part, toolName);
      return presentation ? [{ presentation, strategy }] : [];
    })
  );
  if (calls.length === 0) return null;
  const activities = calls.filter(
    (call): call is (typeof calls)[number] & { presentation: ActivityPresentation } =>
      call.presentation.kind === 'activity'
  );
  const choices = calls.filter(
    (call): call is (typeof calls)[number] & { presentation: ChoicePresentation } =>
      call.presentation.kind === 'choice'
  );
  const showActivityLine = activities.length > 1;

  return (
    <div className="mt-2 space-y-1.5">
      {activities.length > 0 && (
        <Timeline
          aria-label="Groam activity"
          className={
            showActivityLine
              ? 'relative before:absolute before:top-3 before:bottom-3 before:left-0 before:w-px before:bg-border'
              : undefined
          }
        >
          {activities.map(({ presentation, strategy }) => {
            const Component = strategy.Component;
            return (
              <Timeline.Item className="block py-1 before:hidden" key={presentation.key}>
                <Timeline.Body
                  className={showActivityLine ? 'pl-4 text-foreground' : 'text-foreground'}
                >
                  <Component
                    disabled={disabled}
                    onReply={onReply}
                    presentation={presentation}
                    selectedChoices={selectedChoices}
                  />
                </Timeline.Body>
              </Timeline.Item>
            );
          })}
        </Timeline>
      )}
      {choices.map(({ presentation, strategy }) => {
        const Component = strategy.Component;
        return (
          <Component
            disabled={disabled}
            key={presentation.key}
            onReply={onReply}
            presentation={presentation}
            selectedChoices={selectedChoices}
          />
        );
      })}
    </div>
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
        : 'choice';
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

function activityPresentation(part: ToolPart, toolIdOrName: string): ActivityPresentation {
  const status = toolStatus(part);
  const receipt = parseAssistantToolActivity('output' in part ? part.output : undefined);
  const labels = conventionalToolLabel(toolIdOrName);
  return {
    ...(receipt?.detail ? { detail: receipt.detail } : {}),
    key: toolCallKey(part, `${toolIdOrName}:${status}`),
    kind: 'activity',
    label: activityLabel(status, labels, receipt?.label),
    semanticId: receipt?.id ?? toolIdOrName,
    status
  };
}

function toolStatus(part: ToolPart): ToolStatus {
  const state = 'state' in part && typeof part.state === 'string' ? part.state : '';
  if (state === 'output-error') return 'error';
  return state.startsWith('input-') ? 'running' : 'complete';
}

function toolCallKey(part: ToolPart, fallback: string): string {
  return 'toolCallId' in part && typeof part.toolCallId === 'string' ? part.toolCallId : fallback;
}

function activityLabel(
  status: ToolStatus,
  labels: { complete: string; running: string },
  receiptLabel?: string
): string {
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
