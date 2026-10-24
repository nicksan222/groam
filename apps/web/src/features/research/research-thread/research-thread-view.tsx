import { useSetAgentContext } from '@groam/ai/ui/context/agent-context';
import type { Id } from '@groam/backend/data-model';
import { Search } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { PageLoading } from '@groam/ui/components/page-loading';
import { useResearch } from '@/features/research/hooks/use-research';
import { TripSeatGate } from '@/features/trips/trip-detail/trip-seat-gate';
import { Link } from '@/features/workspace/navigation/router';
import { ResearchWorkspace } from './research-workspace';

export function ResearchThreadView({
  researchId,
  tripId
}: {
  researchId: Id<'discussions'>;
  tripId: Id<'trips'>;
}) {
  return (
    <TripSeatGate loadingLabel="Opening research…" tripId={tripId}>
      <ResearchThread researchId={researchId} />
    </TripSeatGate>
  );
}

function ResearchThread({ researchId }: { researchId: Id<'discussions'> }) {
  const { isLoading, research, threadId, writable } = useResearch(researchId);

  useSetAgentContext(
    research
      ? {
          capabilities: ['research.read', 'research.post', 'research.link', 'research.run'],
          data: {
            brief: research.brief,
            canManage: research.canManage,
            links: research.links.map((link) => ({ kind: link.target.kind, label: link.label })),
            researchId: research.id,
            title: research.title,
            writable
          },
          description:
            'Help the group research this topic autonomously with a chosen effort level. Reports, sources, brief, and group notes live here. Use linked trip items as context.',
          key: `research:${research.id}`,
          title: research.title
        }
      : null
  );

  if (isLoading) return <PageLoading label="Opening research…" />;
  if (!research) return <ResearchNotFound />;

  return (
    <ResearchWorkspace
      key={research.id}
      research={research}
      threadId={threadId}
      writable={writable}
    />
  );
}

function ResearchNotFound() {
  return (
    <EmptyScreen
      buttonRaw={
        <Button asChild variant="outline">
          <Link to="/trips">Back to trips</Link>
        </Button>
      }
      description="It may have been removed, or you do not have access to this trip."
      headline="Research not found"
      icon={Search}
    />
  );
}
