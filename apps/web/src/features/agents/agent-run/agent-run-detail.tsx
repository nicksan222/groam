import { agentRunTime } from '@groam/ai/backend/runs/time';
import { Bot } from '@groam/icons';
import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { Button } from '@groam/ui/components/button';
import { MutedCopy } from '@groam/ui/components/muted-copy';
import Shell from '@groam/ui/components/shell/client';
import Timeline from '@groam/ui/components/timeline';
import { initials } from '@groam/ui/lib/avatar';
import type { AgentRun } from '@/features/agents/hooks/use-agent';
import type { AgentRunEvent } from '@/features/agents/hooks/use-agent-run';
import { testIds } from '@/lib/test-ids';
import { AgentRunContext } from './agent-run-context';
import { AgentRunIdea } from './agent-run-idea';
import { AgentRunLog } from './agent-run-log';
import { AgentRunOutcome } from './agent-run-outcome';
import { AgentRunReport } from './agent-run-report';

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type AgentRunDetailLoadedProps = {
  events: AgentRunEvent[] | undefined;
  eventsStatus: 'CanLoadMore' | 'Done' | 'Exhausted' | 'LoadingFirstPage' | 'LoadingMore';
  agentLabel: string;
  isLoading?: false;
  onLoadEarlier: () => void;
  onRetry?: (runId: AgentRun['id']) => Promise<unknown> | unknown;
  onStop?: (runId: AgentRun['id']) => Promise<unknown> | unknown;
  run: AgentRun;
};

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type AgentRunDetailLoadingProps = {
  events?: undefined;
  eventsStatus?: undefined;
  agentLabel?: undefined;
  isLoading: true;
  onLoadEarlier?: undefined;
  run?: undefined;
};

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type AgentRunDetailProps = AgentRunDetailLoadedProps | AgentRunDetailLoadingProps;

function LoadEarlierButton({ props }: { props: AgentRunDetailLoadedProps }) {
  if (props.eventsStatus !== 'CanLoadMore' && props.eventsStatus !== 'LoadingMore') return null;
  const loading = props.eventsStatus === 'LoadingMore';
  return (
    <Button onClick={props.onLoadEarlier} pending={loading} size="sm" variant="outline">
      Load earlier
    </Button>
  );
}

function RunKickoff({ run }: { run: AgentRun }) {
  const at = run.startedAt ?? run.updatedAt;
  return (
    <Timeline.Item condensed>
      <Timeline.Badge className="bg-muted p-0">
        <Avatar className="size-6">
          <AvatarFallback className="text-[9px] font-semibold">
            {initials(run.createdBy.name)}
          </AvatarFallback>
        </Avatar>
      </Timeline.Badge>
      <Timeline.Body className="block pt-1 text-xs leading-5 text-muted-foreground">
        <span className="font-medium text-foreground/80">{run.createdBy.name}</span>{' '}
        {run.kickoff === 'queue' ? 'queued' : 'started'} this run{' '}
        <time dateTime={new Date(at).toISOString()}>{agentRunTime(at)}</time>
      </Timeline.Body>
    </Timeline.Item>
  );
}

function RunReport({ agentLabel, report }: { agentLabel: string; report: string }) {
  return (
    <Timeline.Item>
      <Timeline.Badge className="text-muted-foreground">
        <Bot aria-hidden />
      </Timeline.Badge>
      <Timeline.Body className="block min-w-0 space-y-2">
        <MutedCopy size="xs" className="pt-1">
          <span className="font-medium text-foreground/80">Report</span> from {agentLabel}
        </MutedCopy>
        <AgentRunReport report={report} />
      </Timeline.Body>
    </Timeline.Item>
  );
}

function LoadedRunDetail({ props }: { props: AgentRunDetailLoadedProps }) {
  const { run } = props;
  const issue = run.issueId
    ? { issueId: run.issueId, issueTitle: run.related.issueTitle ?? run.title }
    : null;
  return (
    <AgentRunLog
      after={
        <>
          {run.proposalId && run.tripId ? (
            <AgentRunIdea
              ideaTitle={run.related.ideaTitle}
              proposalId={run.proposalId}
              tripId={run.tripId}
            />
          ) : null}
          {run.report ? <RunReport agentLabel={props.agentLabel} report={run.report} /> : null}
          <AgentRunOutcome onRetry={props.onRetry} onStop={props.onStop} run={run} />
        </>
      }
      before={<RunKickoff run={run} />}
      error={run.error}
      events={props.events}
      isActive={run.status === 'running' || run.status === 'queued'}
      isLoading={props.eventsStatus === 'LoadingFirstPage' || props.events === undefined}
      issue={issue}
      loadEarlier={
        props.eventsStatus === 'CanLoadMore' || props.eventsStatus === 'LoadingMore' ? (
          <LoadEarlierButton props={props} />
        ) : undefined
      }
    />
  );
}

export function AgentRunDetail(props: AgentRunDetailProps) {
  const { run } = props;
  return (
    <Shell.TwoColumns
      as="article"
      aria-busy={!run || undefined}
      aria-label={!run ? 'Loading run…' : undefined}
      role={!run ? 'status' : undefined}
      data-testid={testIds.agentRunDetail}
    >
      <Shell.LeftColumn>
        {run ? <LoadedRunDetail props={props} /> : <AgentRunLog isLoading />}
      </Shell.LeftColumn>
      <Shell.RightColumn aria-label="Run metadata">
        {run ? <AgentRunContext run={run} /> : <AgentRunContext isLoading />}
      </Shell.RightColumn>
    </Shell.TwoColumns>
  );
}
