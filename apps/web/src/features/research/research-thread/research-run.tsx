import { AgentRunBanner } from '@groam/ai/ui/runs/agent-run-banner';
import type { Id } from '@groam/backend/data-model';
import { Markdown } from '@groam/ui/components/markdown';
import { agentRunHref } from '@/features/agents/agent-run/agent-run-href';
import { useResearchRun } from '@/features/research/hooks/use-research-run';
import { Link } from '@/features/workspace/navigation/router';
import { ResearchRunForm } from './research-run-form';

export function ResearchRun({
  discussionId,
  topic,
  writable
}: {
  discussionId: Id<'discussions'>;
  topic: string;
  writable: boolean;
}) {
  const activity = useResearchRun(discussionId);
  const { run } = activity;
  return (
    <section aria-label="Autonomous research" className="space-y-4">
      {activity.isLoading ? (
        <p className="text-sm text-muted-foreground" role="status">
          Loading research activity…
        </p>
      ) : null}
      {writable ? (
        <details open={!run?.report || activity.isActive}>
          <summary
            className="cursor-pointer rounded-sm text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            hidden={!run?.report}
          >
            {activity.isActive ? 'Research in progress' : 'Research again'}
          </summary>
          <div className={run?.report ? 'pt-3' : undefined}>
            <ResearchRunForm
              busy={activity.isStarting || activity.isActive || activity.isLoading}
              onStart={activity.start}
              topic={topic}
            />
          </div>
        </details>
      ) : (
        <p className="text-sm text-muted-foreground">
          This trip is archived. Existing research is available to read.
        </p>
      )}
      {activity.error ? (
        <p className="text-sm text-destructive" role="alert">
          {activity.error}
        </p>
      ) : null}
      {run ? (
        <AgentRunBanner
          agentLabel="Researcher"
          events={activity.events}
          onStop={writable ? activity.stop : undefined}
          run={run}
          viewAgent={<Link {...agentRunHref('researcher', run.id)}>View activity</Link>}
        />
      ) : null}
      {run?.report ? (
        <article aria-label="Research report" className="space-y-3 border-t border-border pt-4">
          <h3 className="text-base font-semibold">Research report</h3>
          <Markdown className="min-w-0 break-words [overflow-wrap:anywhere] [&_p]:leading-7">
            {run.report}
          </Markdown>
        </article>
      ) : null}
    </section>
  );
}
