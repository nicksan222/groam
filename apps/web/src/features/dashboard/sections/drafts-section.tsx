import { Badge } from '@groam/ui/components/badge';
import Shell from '@groam/ui/components/shell/client';
import { ArrowRight } from 'lucide-react';
import { proposalStatusLabel, relativeDate } from '@/features/dashboard/hooks/dashboard-model';
import { IdeaWorkspaceLink } from '@/features/ideas/idea-list/idea-workspace-link';
import type { WorkspaceTripProposal } from '@/features/trips/hooks/use-trips';

export function DraftsSection({ items }: { items: WorkspaceTripProposal[] }) {
  return (
    <Shell.Section aria-labelledby="dashboard-ideas-heading" stack="sm">
      <div>
        <h2
          className="text-base font-semibold tracking-tight text-foreground"
          id="dashboard-ideas-heading"
        >
          Your ideas
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Drafts and changes you are shaping.</p>
      </div>
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-6">
          <p className="text-sm font-medium text-foreground">No ideas in progress</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Start an idea from a trip when you want to propose a change.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {items.map((proposal) => (
            <IdeaWorkspaceLink
              className="group flex min-w-0 items-center gap-3 border-b border-border px-3 py-3 last:border-b-0 hover:bg-muted/60"
              key={proposal.id}
              proposal={proposal}
            >
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-medium text-foreground">
                    {proposal.title}
                  </span>
                  <Badge className="shrink-0 font-normal" variant="secondary">
                    {proposalStatusLabel[proposal.status]}
                  </Badge>
                </span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">
                  {proposal.sourceTripName} · {relativeDate(proposal.updatedAt)}
                </span>
                <span className="mt-1.5 block text-xs font-medium text-primary">
                  {proposal.status === 'conflicted' ? 'Resolve changes' : 'Continue draft'}
                </span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
            </IdeaWorkspaceLink>
          ))}
        </div>
      )}
    </Shell.Section>
  );
}
