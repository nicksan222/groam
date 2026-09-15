import { Badge } from '@groam/ui/components/badge';
import { CountHeading } from '@groam/ui/components/count-heading';
import { MutedCopy } from '@groam/ui/components/muted-copy';
import Shell from '@groam/ui/components/shell/client';
import Timeline from '@groam/ui/components/timeline';
import { ArrowRight, PenLine } from 'lucide-react';
import { proposalStatusLabel, relativeDate } from '@/features/dashboard/hooks/dashboard-model';
import { IdeaWorkspaceLink } from '@/features/ideas/idea-list/idea-workspace-link';
import type { WorkspaceTripProposal } from '@/features/trips/hooks/use-trips';

export function DraftsSection({ items }: { items: WorkspaceTripProposal[] }) {
  return (
    <Shell.Section stack="sm">
      <CountHeading count={items.length} icon={PenLine} title="Your drafts" />
      {items.length === 0 ? (
        <MutedCopy>
          You don’t have a draft yet. Start an idea on a trip — the shared trip stays put until the
          group adds it.
        </MutedCopy>
      ) : (
        <Timeline clipSidebar>
          {items.map((proposal) => {
            return (
              <Timeline.Item key={proposal.id}>
                <Timeline.Badge aria-hidden="true">
                  <PenLine />
                </Timeline.Badge>
                <Timeline.Body>
                  <IdeaWorkspaceLink
                    className="group flex min-w-0 items-center gap-3 rounded-md py-0.5 transition-colors hover:bg-foreground/[0.03]"
                    proposal={proposal}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {proposal.title}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {proposal.sourceTripName} · {relativeDate(proposal.updatedAt)}
                      </span>
                    </span>
                    <Badge
                      className="hidden shrink-0 font-normal sm:inline-flex"
                      variant="secondary"
                    >
                      {proposalStatusLabel[proposal.status]}
                    </Badge>
                    <span className="hidden items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground sm:inline-flex">
                      {proposal.status === 'draft' ? 'Continue your draft' : 'Keep shaping'}
                      <ArrowRight className="size-3.5" />
                    </span>
                  </IdeaWorkspaceLink>
                </Timeline.Body>
              </Timeline.Item>
            );
          })}
        </Timeline>
      )}
    </Shell.Section>
  );
}
