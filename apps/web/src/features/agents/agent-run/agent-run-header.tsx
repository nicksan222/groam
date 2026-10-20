import { agentRunTime } from '@groam/ai/backend/runs/time';
import { Bot, Clock3, Hash, MapPin, UserRound } from '@groam/icons';
import { RecordListBadge } from '@groam/ui/components/record-list-badge';
import Shell from '@groam/ui/components/shell/client';
import type { AgentRun } from '@/features/agents/hooks/use-agent';
import { testIds } from '@/lib/test-ids';
import { AgentRunStatusBadge } from './agent-run-status-badge';

function agentRunSurfaceLabel(run: AgentRun) {
  if (run.agentId === 'reviewer') return 'Idea review';
  if (run.agentId === 'researcher') return 'Research';
  return run.surface === 'chat' ? 'Conversation' : 'Issue resolution';
}

/** Full, wrapping title with the same compact metadata chips as the run list. */
export function AgentRunHeader({ run }: { run: AgentRun }) {
  const startedAt = run.startedAt ?? run.updatedAt;
  return (
    <>
      <Shell.Title
        className="min-w-0 max-w-[60ch] whitespace-normal wrap-anywhere text-lg leading-7 sm:text-xl"
        data-testid={testIds.agentRunTitle}
      >
        {run.title}
      </Shell.Title>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span aria-live="polite">
          <AgentRunStatusBadge status={run.status} />
        </span>
        <RecordListBadge className="gap-1.5">
          <Bot aria-hidden />
          {agentRunSurfaceLabel(run)}
        </RecordListBadge>
        {run.related.tripName ? (
          <RecordListBadge className="min-w-0 max-w-full gap-1.5" title={run.related.tripName}>
            <MapPin aria-hidden className="shrink-0" />
            <span className="truncate">{run.related.tripName}</span>
          </RecordListBadge>
        ) : null}
        <RecordListBadge
          className="min-w-0 max-w-full gap-1.5"
          title={`${run.kickoff === 'queue' ? 'Queued' : 'Started'} by ${run.createdBy.name}`}
        >
          <UserRound aria-hidden className="shrink-0" />
          <span className="truncate">
            <span className="sr-only">{run.kickoff === 'queue' ? 'queued' : 'started'} by </span>
            <span>{run.createdBy.name}</span>
          </span>
        </RecordListBadge>
        <RecordListBadge className="gap-1.5 tabular-nums">
          <Clock3 aria-hidden />
          <time
            dateTime={new Date(startedAt).toISOString()}
            title={new Date(startedAt).toLocaleString()}
          >
            {agentRunTime(startedAt)}
          </time>
        </RecordListBadge>
        <RecordListBadge className="gap-1.5" title="Run ID">
          <Hash aria-hidden />
          <span className="sr-only">#</span>
          {run.shortId}
        </RecordListBadge>
      </div>
    </>
  );
}
