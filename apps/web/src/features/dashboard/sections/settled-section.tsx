import { Check } from '@groam/icons';
import Shell from '@groam/ui/components/shell/client';
import { proposalStatusLabel, relativeDate } from '@/features/dashboard/hooks/dashboard-model';
import { IdeaWorkspaceLink } from '@/features/ideas/idea-list/idea-workspace-link';
import type { WorkspaceTripProposal } from '@/features/trips/hooks/use-trips';

export function SettledSection({ items }: { items: WorkspaceTripProposal[] }) {
  return (
    <Shell.Section aria-labelledby="dashboard-decided-heading" stack="sm">
      <div>
        <h2
          className="text-sm font-semibold tracking-tight text-foreground"
          id="dashboard-decided-heading"
        >
          Recently decided
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          A quiet record of ideas the group applied or closed.
        </p>
      </div>
      <div className="divide-y divide-border border-y border-border">
        {items.map((proposal) => (
          <IdeaWorkspaceLink
            className="group flex min-w-0 items-center gap-3 py-2.5"
            key={proposal.id}
            proposal={proposal}
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
              <Check className="size-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground group-hover:underline group-hover:underline-offset-2">
                {proposal.title}
              </span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {proposalStatusLabel[proposal.status]} · {proposal.sourceTripName} ·{' '}
                {relativeDate(proposal.updatedAt)}
              </span>
            </span>
          </IdeaWorkspaceLink>
        ))}
      </div>
    </Shell.Section>
  );
}
