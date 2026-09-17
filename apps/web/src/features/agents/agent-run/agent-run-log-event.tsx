import { agentRunEventLabels } from '@groam/ai-contracts/agents/runs/events';
import type { AgentRunEventKind } from '@groam/ai-contracts/agents/runs/ids';
import { agentRunTime } from '@groam/ai-contracts/agents/runs/time';
import type { Id } from '@groam/backend/data-model';
import Timeline from '@groam/ui/components/timeline';
import { AlertCircle, Brain, FileText, Info, Wrench } from 'lucide-react';
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
    <details className="mt-3 rounded-lg border border-border text-xs">
      <summary className="cursor-pointer rounded-lg px-3 py-2.5 font-medium text-muted-foreground hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring">
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
      <p className="min-w-0 break-words text-sm">
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
    <p className="min-w-0 break-words text-sm font-medium [overflow-wrap:anywhere]">
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
  const issueStarted = issue && event.label === agentRunEventLabels.issueStarted;
  const issueTitle = issueStarted ? (event.detail ?? issue.issueTitle ?? 'Open issue') : null;
  return (
    <Timeline.Item data-testid={testIds.agentEvent}>
      <Timeline.Badge
        className={failed ? 'border-destructive/40 text-destructive-foreground' : undefined}
      >
        <Icon aria-hidden className="size-3" />
      </Timeline.Badge>
      <Timeline.Body>
        <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <EventTitle
            event={event}
            issue={issue}
            issueStarted={Boolean(issueStarted)}
            issueTitle={issueTitle}
          />
          <time
            className="text-xs tabular-nums text-muted-foreground"
            dateTime={new Date(event.at).toISOString()}
            title={new Date(event.at).toLocaleString()}
          >
            {agentRunTime(event.at)}
          </time>
        </div>
        <EventMeta event={event} failed={failed} />
        <EventDetail error={error} event={event} issueStarted={Boolean(issueStarted)} />
        {event.kind === 'tool' ? <ToolPayload input={event.input} output={event.output} /> : null}
      </Timeline.Body>
    </Timeline.Item>
  );
}

function EventMeta({ event, failed }: { event: AgentRunEvent; failed: boolean }) {
  if (!event.toolName && !failed) return null;
  return (
    <p className="mt-1 break-words text-xs text-muted-foreground">
      {event.toolName}
      {failed ? `${event.toolName ? ' · ' : ''}Failed` : null}
    </p>
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
      className={`mt-2 break-words whitespace-pre-wrap text-sm leading-6 text-muted-foreground${thoughtStyle} [overflow-wrap:anywhere]`}
    >
      {event.detail}
    </p>
  );
}
