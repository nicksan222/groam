import type { Id } from '@groam/backend/data-model';
import { Button } from '@groam/ui/components/button';
import { ArrowUpRight, Lightbulb } from 'lucide-react';
import { defaultIdeaCloneView } from '@/features/ideas/idea-clone/idea-sections';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';

export function AgentRunIdea({
  ideaTitle,
  proposalId,
  tripId
}: {
  ideaTitle: string | null;
  proposalId: Id<'tripProposals'>;
  tripId: Id<'trips'>;
}) {
  return (
    <section
      aria-label="Idea from this run"
      className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] rounded-xl border border-border bg-card p-5"
      data-testid={testIds.agentRunIdea}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Lightbulb aria-hidden className="size-5" />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <h2 className="text-xs font-medium text-muted-foreground">Related idea</h2>
        <p className="break-words text-sm font-semibold [overflow-wrap:anywhere]">
          {ideaTitle ?? 'Untitled idea'}
        </p>
        <p className="text-xs leading-5 text-muted-foreground">
          Open the idea associated with this run.
        </p>
      </div>
      <Button
        asChild
        className="col-start-2 justify-self-start sm:col-start-auto"
        size="sm"
        variant="outline"
      >
        <Link
          params={{ proposalId, tripId, view: defaultIdeaCloneView }}
          to="/trips/$tripId/ideas/$proposalId/$view"
        >
          Open idea
          <ArrowUpRight aria-hidden />
        </Link>
      </Button>
    </section>
  );
}
