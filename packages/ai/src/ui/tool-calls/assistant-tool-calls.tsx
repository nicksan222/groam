import type { UIMessage } from '@convex-dev/agent/react';
import Timeline from '@groam/ui/components/timeline';
import { cn } from '@groam/ui/lib/utils';
import type {
  ActivityPresentation,
  ChoicePresentation
} from '#ai/ui/tool-calls/assistant-tool-call-types';
import { toolCallPresentations } from '#ai/ui/tool-calls/tool-call-presentations';

export function AssistantToolCalls({
  className = 'mt-2',
  disabled,
  kind,
  onReply,
  parts,
  selectedChoices,
  settled = false,
  suppressChoices = false
}: {
  className?: string;
  disabled: boolean;
  /** Render only activity cards or only choice prompts; both when omitted. */
  kind?: 'activity' | 'choice';
  onReply?: (prompt: string) => Promise<boolean>;
  parts: UIMessage['parts'];
  selectedChoices?: Record<string, string>;
  /** True once the message is no longer streaming; unfinished tool calls then read as stopped. */
  settled?: boolean;
  suppressChoices?: boolean;
}) {
  const calls = toolCallPresentations(parts, { kind, settled, suppressChoices });
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
    <div className={cn('space-y-1.5', className)}>
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
