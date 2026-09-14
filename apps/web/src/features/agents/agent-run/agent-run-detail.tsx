import { Button } from '@groam/ui/components/button';
import Shell from '@groam/ui/components/shell/client';
import { Spinner } from '@groam/ui/components/spinner';
import type { AgentRun } from '@/features/agents/hooks/use-agent';
import type { AgentRunEvent } from '@/features/agents/hooks/use-agent-run';
import { testIds } from '@/lib/test-ids';
import { AgentRunContext } from './agent-run-context';
import { AgentRunIdea } from './agent-run-idea';
import { AgentRunLog } from './agent-run-log';
import { AgentRunOutcome } from './agent-run-outcome';
import { AgentRunReport } from './agent-run-report';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type AgentRunDetailLoadedProps = {
  events: AgentRunEvent[] | undefined;
  eventsStatus: 'CanLoadMore' | 'Done' | 'Exhausted' | 'LoadingFirstPage' | 'LoadingMore';
  isLoading?: false;
  onLoadEarlier: () => void;
  run: AgentRun;
};

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type AgentRunDetailLoadingProps = {
  events?: undefined;
  eventsStatus?: undefined;
  isLoading: true;
  onLoadEarlier?: undefined;
  run?: undefined;
};

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type AgentRunDetailProps = AgentRunDetailLoadedProps | AgentRunDetailLoadingProps;

function LoadEarlierButton({ props }: { props: AgentRunDetailLoadedProps }) {
  if (props.eventsStatus !== 'CanLoadMore' && props.eventsStatus !== 'LoadingMore') return null;
  const loading = props.eventsStatus === 'LoadingMore';
  return (
    <Button
      aria-busy={loading}
      disabled={loading}
      onClick={props.onLoadEarlier}
      size="sm"
      variant="outline"
    >
      {loading ? <Spinner aria-hidden /> : null}Load earlier
    </Button>
  );
}

function LoadedRunDetail({ props }: { props: AgentRunDetailLoadedProps }) {
  const { run } = props;
  const issue = run.issueId
    ? { issueId: run.issueId, issueTitle: run.related.issueTitle ?? run.title }
    : null;
  return (
    <>
      <AgentRunOutcome run={run} />
      {run.proposalId && run.tripId ? (
        <AgentRunIdea
          ideaTitle={run.related.ideaTitle}
          proposalId={run.proposalId}
          tripId={run.tripId}
        />
      ) : null}
      {run.report ? <AgentRunReport report={run.report} /> : null}
      <AgentRunLog
        error={run.error}
        events={props.events}
        isActive={run.status === 'running' || run.status === 'queued'}
        isLoading={props.eventsStatus === 'LoadingFirstPage' || props.events === undefined}
        issue={issue}
        loadEarlier={<LoadEarlierButton props={props} />}
      />
    </>
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
        <div className="min-w-0 space-y-5 xl:pt-6">
          {run ? <LoadedRunDetail props={props} /> : <AgentRunLog isLoading />}
        </div>
      </Shell.LeftColumn>
      <Shell.RightColumn aria-label="Run metadata">
        {run ? <AgentRunContext run={run} /> : <AgentRunContext isLoading />}
      </Shell.RightColumn>
    </Shell.TwoColumns>
  );
}
