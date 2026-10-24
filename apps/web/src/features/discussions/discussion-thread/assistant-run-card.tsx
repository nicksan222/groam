import type { UIMessage } from '@convex-dev/agent/react';
import { useSmoothText } from '@convex-dev/agent/react';
import {
  type ActivityPresentation,
  assistantReplyText,
  assistantRunActivities
} from '@groam/ai/ui/messages/assistant-run-activities';
import { AssistantReplyExtras } from '@groam/ai/ui/messages/assistant-run-parts';
import { MessageSquareText, Paperclip, Sparkles, UserRound } from '@groam/icons';
import { Markdown } from '@groam/ui/components/markdown';
import Timeline from '@groam/ui/components/timeline';
import { cn } from '@groam/ui/lib/utils';
import type { ReactNode } from 'react';
import { AgentRunLogEvent } from '@/features/agents/agent-run/agent-run-log-event';
import { AgentRunStatusBadge } from '@/features/agents/agent-run/agent-run-status-badge';
import { testIds } from '@/lib/test-ids';
import type { AgentRunEvent } from '@/types/agents';
import type { AssistantRunPrompt } from '@/types/discussions';

function runStatus(message: UIMessage) {
  if (message.status === 'failed') return 'failed';
  if (message.status === 'pending') return 'queued';
  if (message.status === 'streaming') return 'running';
  return 'complete';
}

/** Chat tool steps in the agent run log's event shape, so they read like an agent run. */
function activityEvent(activity: ActivityPresentation, at: number): AgentRunEvent {
  return {
    at,
    detail: activity.detail ?? null,
    id: activity.key as AgentRunEvent['id'],
    input: null,
    kind: activity.status === 'error' ? 'error' : 'tool',
    label: activity.label,
    ok: activity.status === 'error' ? false : activity.status === 'complete' ? true : null,
    output: null,
    seq: 0,
    toolName: null
  };
}

// Bare icons on the rail; chat steps share one timestamp, so per-step times are hidden.
const softRail =
  '[&_[data-slot=timeline-badge]]:rounded-none [&_[data-slot=timeline-badge]]:border-0 [&_[data-slot=timeline-badge]]:bg-transparent [&_[data-slot=timeline-badge]]:ring-0 [&_[data-slot=timeline-badge]>svg]:size-3.5 [&_[data-testid=agent-event]_time]:hidden';

/**
 * One Groam exchange in a group thread, shown like an agent run: the message that asked,
 * the steps Groam took, then its reply. Without a prompt it shows the run alone.
 */
export function AssistantRunCard({
  actions,
  mine = false,
  prompt,
  reactions,
  replies
}: {
  /** Message tools for the prompt (react, edit, delete), revealed on hover in the header. */
  actions?: ReactNode;
  mine?: boolean;
  prompt?: AssistantRunPrompt;
  reactions?: ReactNode;
  replies: UIMessage[];
}) {
  const latest = replies.at(-1);
  return (
    <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <article
        aria-label="Groam reply"
        data-content={prompt?.text}
        data-testid={prompt ? testIds.chatMessage : undefined}
        className={cn(
          'group/message relative w-full max-w-[min(100%,36rem)] rounded-2xl bg-muted/35 px-4 py-3 text-foreground',
          softRail
        )}
      >
        <header className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles aria-hidden className="size-3.5" />
          <span className="font-medium">Groam</span>
          <span className="ml-auto flex items-center gap-1">
            {latest ? (
              <AgentRunStatusBadge
                className="h-auto border-transparent bg-transparent px-0 text-[11px] font-normal text-muted-foreground"
                status={runStatus(latest)}
              />
            ) : null}
            {actions}
          </span>
        </header>
        <Timeline aria-label="Groam run" clipSidebar variant="activity">
          {prompt ? <PromptEntry prompt={prompt} /> : null}
          {replies.map((reply) => (
            <ReplyRun key={reply.key} message={reply} />
          ))}
        </Timeline>
        {replies.map((reply) => (
          <ReplyExtras key={reply.key} message={reply} />
        ))}
        {reactions ? <div className="mt-2 flex flex-wrap gap-1">{reactions}</div> : null}
      </article>
    </div>
  );
}

function PromptEntry({ prompt }: { prompt: AssistantRunPrompt }) {
  return (
    <Timeline.Item>
      <Timeline.Badge className="text-muted-foreground">
        <UserRound aria-hidden />
      </Timeline.Badge>
      <Timeline.Body className="block pt-1">
        <p className="flex items-baseline gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">{prompt.authorName}</span>
          <time dateTime={new Date(prompt.createdAt).toISOString()}>
            {promptTime(prompt.createdAt)}
          </time>
        </p>
        <Markdown className="mt-1 [overflow-wrap:anywhere]">{prompt.text}</Markdown>
        {prompt.attachmentCount > 0 ? (
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Paperclip aria-hidden className="size-3" />
            {prompt.attachmentCount === 1
              ? '1 attachment'
              : `${prompt.attachmentCount} attachments`}
          </p>
        ) : null}
      </Timeline.Body>
    </Timeline.Item>
  );
}

/** Steps and reply of one Groam message, as rows of the shared run timeline. */
function ReplyRun({ message }: { message: UIMessage }) {
  const status = runStatus(message);
  const active = status === 'running' || status === 'queued';
  const [visibleText] = useSmoothText(message.text, { startStreaming: active });
  const text = assistantReplyText(visibleText);
  const events = assistantRunActivities(message).map((activity) =>
    activityEvent(activity, message._creationTime)
  );
  return (
    <>
      {events.map((event) => (
        <AgentRunLogEvent event={event} key={event.id} />
      ))}
      {text.trim() ? (
        <ReplyEntry streaming={active} text={text} />
      ) : active ? (
        <Timeline.Item condensed>
          <Timeline.Badge className="text-muted-foreground">
            <Sparkles aria-hidden />
          </Timeline.Badge>
          <Timeline.Body className="block pt-1 text-xs leading-5 text-muted-foreground">
            <span className="shimmer font-medium">Groam is working</span>
          </Timeline.Body>
        </Timeline.Item>
      ) : null}
    </>
  );
}

function ReplyExtras({ message }: { message: UIMessage }) {
  const [visibleText] = useSmoothText(message.text, {
    startStreaming: message.status === 'streaming'
  });
  return <AssistantReplyExtras message={message} text={assistantReplyText(visibleText)} />;
}

function ReplyEntry({ streaming, text }: { streaming: boolean; text: string }) {
  return (
    <Timeline.Item>
      <Timeline.Badge className="text-muted-foreground">
        <MessageSquareText aria-hidden />
      </Timeline.Badge>
      <Timeline.Body className="block pt-1 [overflow-wrap:anywhere]">
        <Markdown streaming={streaming}>{text}</Markdown>
      </Timeline.Body>
    </Timeline.Item>
  );
}

function promptTime(createdAt: number): string {
  return new Date(createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
