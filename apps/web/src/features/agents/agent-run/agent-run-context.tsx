import { isActiveAgentRun } from '@groam/ai-contracts/agents/runs/roster';
import { agentRunDuration, agentRunTime } from '@groam/ai-contracts/agents/runs/time';
import { Skeleton } from '@groam/ui/components/skeleton';
import { Clock3, UserRound } from 'lucide-react';
import type { AgentRun } from '@/features/agents/hooks/use-agent';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type AgentRunContextProps = { isLoading?: boolean; run?: AgentRun };

function RunTimestamp({
  activeLabel,
  emptyLabel,
  value
}: {
  activeLabel?: string;
  emptyLabel: string;
  value: number | null;
}) {
  if (value === null) return activeLabel ?? emptyLabel;
  const date = new Date(value);
  return (
    <time dateTime={date.toISOString()} title={date.toLocaleString()}>
      {agentRunTime(value)}
    </time>
  );
}

function RunDetails({ run }: { run: AgentRun }) {
  const active = isActiveAgentRun(run);
  return (
    <dl className="mt-5 space-y-5 text-sm">
      <div className="space-y-2">
        <dt className="text-xs text-muted-foreground">Called by</dt>
        <dd className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
            <UserRound aria-hidden className="size-4 text-muted-foreground" />
          </span>
          <span className="min-w-0">
            <span className="block break-words font-medium">{run.createdBy.name}</span>
            <span className="block text-xs text-muted-foreground">
              {run.kickoff === 'queue' ? 'Queued' : 'Assigned'}
            </span>
          </span>
        </dd>
      </div>
      <div className="space-y-1.5 border-t border-border pt-4">
        <dt className="text-xs text-muted-foreground">Started</dt>
        <dd>
          <RunTimestamp
            activeLabel={run.status === 'queued' ? 'Waiting to start' : undefined}
            emptyLabel="Not recorded"
            value={run.startedAt}
          />
        </dd>
      </div>
      {run.status !== 'queued' ? (
        <div className="space-y-1.5">
          <dt className="text-xs text-muted-foreground">{active ? 'Progress' : 'Finished'}</dt>
          <dd>
            <RunTimestamp
              activeLabel={active ? 'In progress' : undefined}
              emptyLabel="Not recorded"
              value={run.completedAt}
            />
          </dd>
        </div>
      ) : null}
      {run.startedAt !== null && run.completedAt !== null ? (
        <div className="space-y-1.5">
          <dt className="text-xs text-muted-foreground">Duration</dt>
          <dd className="font-medium tabular-nums">
            {agentRunDuration(run.startedAt, run.completedAt)}
          </dd>
        </div>
      ) : null}
      {run.discussionId ? (
        <div className="space-y-1.5 border-t border-border pt-4">
          <dt className="text-xs text-muted-foreground">Chat</dt>
          <dd>
            <Link
              className="break-words font-medium underline-offset-4 hover:underline"
              params={{ discussionId: run.discussionId }}
              to="/chat/$discussionId"
            >
              {run.related.chatTitle ?? run.title}
            </Link>
          </dd>
        </div>
      ) : null}
      <div className="space-y-1.5 border-t border-border pt-4">
        <dt className="text-xs text-muted-foreground">Run ID</dt>
        <dd className="break-all font-mono text-xs leading-5 text-muted-foreground">
          {run.shortId ?? run.id}
        </dd>
      </div>
    </dl>
  );
}

export function AgentRunContext({ isLoading, run }: AgentRunContextProps) {
  return (
    <section
      aria-label="Run details"
      className="rounded-xl border border-border bg-card p-5"
      data-testid={testIds.agentRunContext}
    >
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Clock3 aria-hidden className="size-4 text-muted-foreground" />
        Run details
      </h2>
      {isLoading || !run ? (
        <div className="mt-5 space-y-5">
          {['caller', 'start', 'end'].map((key) => (
            <Skeleton className="h-10 w-full" key={key} />
          ))}
        </div>
      ) : (
        <RunDetails run={run} />
      )}
    </section>
  );
}
