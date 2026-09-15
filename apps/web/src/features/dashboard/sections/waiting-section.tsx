import { Button } from '@groam/ui/components/button';
import { CountHeading } from '@groam/ui/components/count-heading';
import { MutedCopy } from '@groam/ui/components/muted-copy';
import Shell from '@groam/ui/components/shell/client';
import Timeline from '@groam/ui/components/timeline';
import { ArrowRight, Inbox } from 'lucide-react';
import { initials, relativeDate } from '@/features/dashboard/hooks/dashboard-model';
import { IdeaWorkspaceLink } from '@/features/ideas/idea-list/idea-workspace-link';
import type { WorkspaceTripProposal } from '@/features/trips/hooks/use-trips';

export function WaitingSection({ items }: { items: WorkspaceTripProposal[] }) {
  return (
    <Shell.Section stack="sm">
      <CountHeading count={items.length} icon={Inbox} title="Waiting on you" />
      {items.length === 0 ? (
        <MutedCopy>Nothing is waiting on your take right now.</MutedCopy>
      ) : (
        <Timeline>
          {items.map((proposal) => {
            return (
              <Timeline.Item key={proposal.id}>
                <Timeline.Badge aria-hidden="true">{initials(proposal.author.name)}</Timeline.Badge>
                <Timeline.Body>
                  <Timeline.Card surface="lift">
                    <Timeline.CardHeader className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{proposal.author.name}</span>
                      <span className="hidden sm:inline"> asked for your take on </span>
                      <span className="sm:hidden"> · </span>
                      <span className="font-medium text-foreground">{proposal.sourceTripName}</span>
                    </Timeline.CardHeader>
                    <Timeline.CardBody className="space-y-1">
                      <IdeaWorkspaceLink
                        className="text-base font-semibold tracking-tight text-foreground break-words hover:underline hover:underline-offset-2 sm:text-lg"
                        proposal={proposal}
                      >
                        {proposal.title}
                      </IdeaWorkspaceLink>
                      <p className="text-[11px] text-muted-foreground">
                        Updated {relativeDate(proposal.updatedAt)}
                      </p>
                    </Timeline.CardBody>
                    <Timeline.CardActions>
                      <Button asChild size="sm">
                        <IdeaWorkspaceLink proposal={proposal}>
                          Give your take
                          <ArrowRight />
                        </IdeaWorkspaceLink>
                      </Button>
                    </Timeline.CardActions>
                  </Timeline.Card>
                </Timeline.Body>
              </Timeline.Item>
            );
          })}
        </Timeline>
      )}
    </Shell.Section>
  );
}
