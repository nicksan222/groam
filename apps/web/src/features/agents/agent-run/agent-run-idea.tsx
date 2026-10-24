import type { Id } from '@groam/backend/data-model';
import { ArrowUpRight, Lightbulb } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import Timeline from '@groam/ui/components/timeline';
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
    <Timeline.Item data-testid={testIds.agentRunIdea}>
      <Timeline.Badge className="border-primary/30 bg-primary/10 text-primary">
        <Lightbulb aria-hidden />
      </Timeline.Badge>
      <Timeline.Body className="block">
        <Timeline.Card aria-label="Idea from this run">
          <Timeline.CardBody className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 px-3 py-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-xs text-muted-foreground">Related idea</h2>
              <p className="break-words text-sm font-medium [overflow-wrap:anywhere]">
                {ideaTitle ?? 'Untitled idea'}
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link
                params={{ proposalId, tripId, view: defaultIdeaCloneView }}
                to="/trips/$tripId/ideas/$proposalId/$view"
              >
                Open idea
                <ArrowUpRight aria-hidden />
              </Link>
            </Button>
          </Timeline.CardBody>
        </Timeline.Card>
      </Timeline.Body>
    </Timeline.Item>
  );
}
