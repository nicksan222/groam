import { isActiveAgentRun } from '@groam/ai/backend/runs/roster';
import { agentRunDuration, agentRunTime } from '@groam/ai/backend/runs/time';
import { Copy } from '@groam/icons';
import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { Button } from '@groam/ui/components/button';
import { DetailSection } from '@groam/ui/components/detail-section';
import { MutedCopy } from '@groam/ui/components/muted-copy';
import { PageLoading } from '@groam/ui/components/page-loading';
import { toast } from '@groam/ui/components/toast';
import { initials } from '@groam/ui/lib/avatar';
import type { AgentRun } from '@/features/agents/hooks/use-agent';
import { chatHref } from '@/features/discussions/chat/chat-href';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
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

function CopyRunId({ value }: { value: string }) {
  return (
    <Button
      aria-label="Copy run ID"
      className="-mr-2 text-muted-foreground hover:text-foreground"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          toast.success('Run ID copied');
        } catch {
          toast.error('Could not copy the run ID. Select it instead.');
        }
      }}
      size="icon-xs"
      variant="ghost"
    >
      <Copy />
    </Button>
  );
}

function RunDetails({ run }: { run: AgentRun }) {
  const active = isActiveAgentRun(run);
  const runId = run.shortId;
  return (
    <>
      <DetailSection title="Called by">
        <p className="flex min-w-0 items-center gap-2 text-sm font-medium">
          <Avatar className="size-5">
            <AvatarFallback className="text-[8px] font-semibold">
              {initials(run.createdBy.name)}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 truncate">{run.createdBy.name}</span>
          <span className="text-xs font-normal text-muted-foreground">
            {run.kickoff === 'queue' ? 'Queued' : 'Assigned'}
          </span>
        </p>
      </DetailSection>
      <DetailSection title="Started">
        <p className="text-sm">
          <RunTimestamp
            activeLabel={run.status === 'queued' ? 'Waiting to start' : undefined}
            emptyLabel="Not recorded"
            value={run.startedAt}
          />
        </p>
      </DetailSection>
      {run.status !== 'queued' ? (
        <DetailSection title={active ? 'Progress' : 'Finished'}>
          <p className="text-sm">
            <RunTimestamp
              activeLabel={active ? 'In progress' : undefined}
              emptyLabel="Not recorded"
              value={run.completedAt}
            />
            {run.startedAt !== null && run.completedAt !== null ? (
              <span className="text-muted-foreground">
                {' · '}
                <span className="tabular-nums">
                  {agentRunDuration(run.startedAt, run.completedAt)}
                </span>
              </span>
            ) : null}
          </p>
        </DetailSection>
      ) : null}
      {run.discussionId ? (
        <DetailSection title="Chat">
          <Link
            className="block break-words text-sm font-medium hover:underline"
            {...chatHref({ discussionId: run.discussionId, tripId: run.tripId })}
          >
            {run.related.chatTitle ?? run.title}
          </Link>
        </DetailSection>
      ) : null}
      <DetailSection action={<CopyRunId value={runId} />} title="Run ID">
        <MutedCopy size="xs" className="break-all font-mono">
          {runId}
        </MutedCopy>
      </DetailSection>
    </>
  );
}

export function AgentRunContext({ isLoading, run }: AgentRunContextProps) {
  return (
    <div aria-label="Run details" data-testid={testIds.agentRunContext} role="group">
      {isLoading || !run ? <PageLoading label="Loading run details…" /> : <RunDetails run={run} />}
    </div>
  );
}
