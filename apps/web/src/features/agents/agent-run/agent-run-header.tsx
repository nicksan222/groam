import { agentRunTime } from '@groam/ai/backend/runs/time';
import Shell from '@groam/ui/components/shell/client';
import { SHELL_HEADER_FACT } from '@groam/ui/lib/shell-layout';
import type { AgentRun } from '@/features/agents/hooks/use-agent';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import { agentHref, type agentRunBack } from './agent-run-href';
import { AgentRunStatusBadge } from './agent-run-status-badge';

function agentRunSurfaceLabel(run: AgentRun) {
  if (run.agentId === 'reviewer') return 'Idea review';
  if (run.agentId === 'researcher') return 'Research';
  return run.surface === 'chat' ? 'Conversation' : 'Issue resolution';
}

/** A run's page header: where it came from, the run's title and status, and who started it and when. */
export function AgentRunHeader({
  agent,
  back,
  run
}: {
  agent: { id: string; label: string };
  back: ReturnType<typeof agentRunBack>;
  run: AgentRun;
}) {
  const startedAt = run.startedAt ?? run.updatedAt;
  return (
    <Shell.Header
      meta={
        <>
          <span className={SHELL_HEADER_FACT}>
            <Link
              className="font-medium text-foreground underline-offset-4 hover:underline"
              {...agentHref(agent.id)}
            >
              {agent.label}
            </Link>
          </span>
          <span className={SHELL_HEADER_FACT}>{agentRunSurfaceLabel(run)}</span>
          {run.related.tripName ? (
            <span className={SHELL_HEADER_FACT} title={run.related.tripName}>
              <span className="truncate">{run.related.tripName}</span>
            </span>
          ) : null}
          <span className={SHELL_HEADER_FACT}>
            <span className="truncate">
              {run.kickoff === 'queue' ? 'Queued' : 'Started'} by {run.createdBy.name}
            </span>
          </span>
          <span className={SHELL_HEADER_FACT}>
            <time
              className="tabular-nums"
              dateTime={new Date(startedAt).toISOString()}
              title={new Date(startedAt).toLocaleString()}
            >
              {agentRunTime(startedAt)}
            </time>
          </span>
          <span className={SHELL_HEADER_FACT} title="Run ID">
            <span className="tabular-nums">#{run.shortId}</span>
          </span>
        </>
      }
      parent={<Link {...back.target}>{back.label}</Link>}
      status={
        <span aria-live="polite">
          <AgentRunStatusBadge status={run.status} />
        </span>
      }
      title={run.title}
      titleProps={{ 'data-testid': testIds.agentRunTitle }}
    />
  );
}
