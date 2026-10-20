import type { Id } from '@groam/backend/data-model';
import { createFileRoute } from '@tanstack/react-router';
import { ResearchThreadView } from '@/features/research/research-thread/research-thread-view';
import { useResolvedParams } from '@/features/workspace/hooks/reference-context';

export const Route = createFileRoute('/_workspace/trips/$tripId/research/$researchId')({
  component: ResearchThreadPage
});

function ResearchThreadPage() {
  const { researchId, tripId } = useResolvedParams(Route.useParams());
  return (
    <ResearchThreadView
      researchId={researchId as Id<'discussions'>}
      tripId={tripId as Id<'trips'>}
    />
  );
}
