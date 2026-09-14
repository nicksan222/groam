import { CountHeading } from '@groam/ui/components/count-heading';
import { MutedCopy } from '@groam/ui/components/muted-copy';
import Shell from '@groam/ui/components/shell/client';
import Timeline from '@groam/ui/components/timeline';
import { cn } from '@groam/ui/lib/utils';
import { Check, CheckCircle2 } from 'lucide-react';
import { proposalStatusLabel, relativeDate } from '@/features/dashboard/hooks/dashboard-model';
import { IdeaWorkspaceLink } from '@/features/ideas/idea-list/idea-workspace-link';
import type { WorkspaceTripProposal } from '@/features/trips/hooks/use-trips';

export function SettledSection({ items }: { items: WorkspaceTripProposal[] }) {
  return (
    <Shell.Section stack="sm">
      <CountHeading count={items.length} icon={CheckCircle2} title="Recently settled" />
      {items.length === 0 ? (
        <MutedCopy>Ideas the group settles will show up here.</MutedCopy>
      ) : (
        <Timeline variant="minimal">
          {items.map((proposal) => {
            const applied = proposal.status === 'merged';
            return (
              <Timeline.Item key={proposal.id}>
                <Timeline.Badge
                  className={cn(
                    applied ? 'border-primary/40 bg-primary/10 text-primary' : undefined
                  )}
                >
                  <Check strokeWidth={3} />
                </Timeline.Badge>
                <Timeline.Body>
                  <IdeaWorkspaceLink
                    className="group -mx-1 block rounded-md px-1 py-0.5 transition-colors hover:bg-foreground/[0.03]"
                    proposal={proposal}
                  >
                    <p className="truncate text-sm font-medium text-foreground group-hover:underline group-hover:underline-offset-2">
                      {proposal.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {proposalStatusLabel[proposal.status]} · {proposal.sourceTripName} ·{' '}
                      {relativeDate(proposal.updatedAt)}
                    </p>
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
