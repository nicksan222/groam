import { agentRunEventLabels } from '@groam/ai/backend/runs/events';
import type { AgentRunEventKind } from '@groam/ai/backend/runs/ids';
import { agentRunTime } from '@groam/ai/backend/runs/time';
import type { Id } from '@groam/backend/data-model';
import { AlertCircle, Brain, FileText, Info, Wrench } from '@groam/icons';
import Timeline from '@groam/ui/components/timeline';
import type { AgentRunEvent } from '@/features/agents/hooks/use-agent-run';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import { prettyJson } from './pretty-json';

const kindIcon = {
  error: AlertCircle,
  report: FileText,
  status: Info,
  thought: Brain,

  tool: Wrench
} as const satisfies Record<AgentRunEventKind, typeof Info>;

function ToolPayload({ input, output }: Pick<AgentRunEvent, 'input' | 'output'>) {
  if (!input && !output) return null;
  return (
    <details className="mt-1.5 rounded-md border border-border/70 bg-background text-xs">
      <summary className="cursor-pointer rounded-md px-2.5 py-1.5 font-medium text-muted-foreground hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring">
        Tool payload
      </summary>
      <div className="space-y-3 border-t border-border p-3">
        {input ? <PayloadValue label="Input" value={input} /> : null}
        {output ? <PayloadValue label="Output" value={output} /> : null}
      </div>
    </details>
  );
}

function PayloadValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1.5 font-medium">{label}</p>
      <pre className="max-h-72 overflow-auto break-words whitespace-pre-wrap rounded-md bg-muted/50 p-3 font-mono text-xs leading-5">
        {prettyJson(value)}
      </pre>
    </div>
  );
}

function EventTitle({
  event,
  issue,
  issueStarted,
  issueTitle
}: {
  event: AgentRunEvent;
  issue?: { issueId: Id<'tripIssues'>; issueTitle: string | null } | null;
  issueStarted: boolean;
  issueTitle: string | null;
}) {
  if (issueStarted && issue && issueTitle) {
    return (
      <p className="min-w-0 break-words text-xs leading-5 text-foreground/80">
        Started working on{' '}
        <Link
          className="font-medium hover:underline"
          params={{ issueId: issue.issueId }}
          to="/issues/$issueId"
        >
          {issueTitle}
        </Link>
      </p>
    );
  }
  return (
    <p className="min-w-0 break-words text-xs leading-5 font-medium text-foreground/80 [overflow-wrap:anywhere]">
      {event.label}
    </p>
  );
}

export function AgentRunLogEvent({
  error,
  event,
  issue
}: {
  error?: string | null;
  event: AgentRunEvent;
  issue?: { issueId: Id<'tripIssues'>; issueTitle: string | null } | null;
}) {
  const Icon = kindIcon[event.kind] ?? Info;
  const failed = event.kind === 'error' || event.ok === false;
  const toolFailed = event.kind !== 'error' && event.ok === false;
  const issueStarted = issue && event.label === agentRunEventLabels.issueStarted;
  const issueTitle = issueStarted ? (event.detail ?? issue.issueTitle ?? 'Open issue') : null;
  return (
    <Timeline.Item condensed data-testid={testIds.agentEvent}>
      <Timeline.Badge
        className={
          failed
            ? 'border-destructive/40 bg-destructive/10 text-destructive'
            : 'border-border/50 bg-muted/40 text-muted-foreground'
        }
      >
        <Icon aria-hidden />
      </Timeline.Badge>
      <Timeline.Body className="block min-w-0 pt-0.5">
        <div className="flex min-w-0 items-baseline gap-x-2">
          <EventTitle
            event={event}
            issue={issue}
            issueStarted={Boolean(issueStarted)}
            issueTitle={issueTitle}
          />
          <EventMeta event={event} failed={toolFailed} />
          <time
            className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground"
            dateTime={new Date(event.at).toISOString()}
            title={new Date(event.at).toLocaleString()}
          >
            {agentRunTime(event.at)}
          </time>
        </div>
        <EventDetail error={error} event={event} issueStarted={Boolean(issueStarted)} />
        {event.kind === 'tool' ? <ToolPayload input={event.input} output={event.output} /> : null}
      </Timeline.Body>
    </Timeline.Item>
  );
}

function EventMeta({ event, failed }: { event: AgentRunEvent; failed: boolean }) {
  if (!event.toolName && !failed) return null;
  return (
    <span
      className={`min-w-0 truncate font-mono text-xs ${failed ? 'text-destructive' : 'text-muted-foreground'}`}
    >
      {event.toolName}
      {failed ? `${event.toolName ? ' · ' : ''}failed` : null}
    </span>
  );
}

function EventDetail({
  error,
  event,
  issueStarted
}: {
  error?: string | null;
  event: AgentRunEvent;
  issueStarted: boolean;
}) {
  const showDetail =
    event.detail && !issueStarted && !(event.kind === 'error' && event.detail === error);
  if (!showDetail) return null;
  const thoughtStyle = event.kind === 'thought' ? ' italic' : '';
  return (
    <p
      className={`mt-0.5 line-clamp-6 break-words whitespace-pre-wrap text-xs leading-5 text-muted-foreground${thoughtStyle} [overflow-wrap:anywhere]`}
    >
      {event.detail}
    </p>
  );
}
