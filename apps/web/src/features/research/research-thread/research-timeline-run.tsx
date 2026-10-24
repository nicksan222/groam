import { AgentRunBanner } from '@groam/ai/ui/runs/agent-run-banner';
import { agentRunHref } from '@/features/agents/agent-run/agent-run-href';
import type { useResearchRun } from '@/features/research/hooks/use-research-run';
import { Link } from '@/features/workspace/navigation/router';

const stamp = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** A researcher run in the history: live progress while it works, then a one-line record. */
export function ResearchTimelineRun({
  activity,
  caveat,
  run,
  sourceCount,
  writable
}: {
  activity: ReturnType<typeof useResearchRun>;
  caveat: null | string;
  run: NonNullable<ReturnType<typeof useResearchRun>['run']>;
  sourceCount: number;
  writable: boolean;
}) {
  if (activity.isActive || run.status === 'failed')
    return (
      <AgentRunBanner
        agentLabel="Researcher"
        events={activity.events}
        onStop={writable ? activity.stop : undefined}
        run={run}
        viewAgent={<Link {...agentRunHref('researcher', run.id)}>View activity</Link>}
      />
    );
  const finishedAt = run.completedAt ?? run.updatedAt;
  return (
    <div>
      <p className="text-xs leading-6 text-muted-foreground">
        <span className="font-medium text-foreground">Researcher</span> finished a run
        {sourceCount ? ` · cited ${sourceCount} source${sourceCount === 1 ? '' : 's'}` : ''}
        <time className="ml-2 tabular-nums" dateTime={new Date(finishedAt).toISOString()}>
          {stamp.format(finishedAt)}
        </time>
        <Link
          {...agentRunHref('researcher', run.id)}
          className="ml-2 rounded-sm font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          View activity
        </Link>
      </p>
      {caveat ? <p className="mt-1 text-xs leading-5 text-warning">{caveat}</p> : null}
    </div>
  );
}
