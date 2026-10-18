import type { Id } from '@groam/backend/data-model';
import { createFileRoute } from '@tanstack/react-router';
import { IdeaDetailView } from '@/features/ideas/idea-detail/idea-detail-view';
import { useResolvedParams } from '@/features/workspace/hooks/reference-context';

export const Route = createFileRoute('/_workspace/ideas/$proposalId')({
  component: IdeaDetailPage
});

function IdeaDetailPage() {
  const { proposalId } = useResolvedParams(Route.useParams());
  return <IdeaDetailView proposalId={proposalId as Id<'tripProposals'>} />;
}
