import { Button } from '@groam/ui/components/button';
import Shell from '@groam/ui/components/shell/client';
import { ArrowRight } from 'lucide-react';
import { relativeDate } from '@/features/dashboard/hooks/dashboard-model';
import { IdeaWorkspaceLink } from '@/features/ideas/idea-list/idea-workspace-link';
import type { WorkspaceTripProposal } from '@/features/trips/hooks/use-trips';

export function WaitingSection({ items }: { items: WorkspaceTripProposal[] }) {
  return (
    <Shell.Section aria-labelledby="dashboard-attention-heading" stack="sm">
      <div>
        <h2
          className="text-base font-semibold tracking-tight text-foreground"
          id="dashboard-attention-heading"
        >
          Needs your attention
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ideas the group has asked you to review.
        </p>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        {items.map((proposal) => (
          <article
            className="flex min-w-0 flex-col rounded-lg border border-border bg-card p-4"
            key={proposal.id}
          >
            <p className="truncate text-xs text-muted-foreground">
              {proposal.sourceTripName} · {relativeDate(proposal.updatedAt)}
            </p>
            <IdeaWorkspaceLink
              className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-foreground hover:underline hover:underline-offset-2"
              proposal={proposal}
            >
              {proposal.title}
            </IdeaWorkspaceLink>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              Requested by {proposal.author.name}
            </p>
            <div className="mt-4">
              <Button asChild size="sm" variant="outline">
                <IdeaWorkspaceLink proposal={proposal}>
                  Review idea
                  <ArrowRight />
                </IdeaWorkspaceLink>
              </Button>
            </div>
          </article>
        ))}
      </div>
    </Shell.Section>
  );
}
