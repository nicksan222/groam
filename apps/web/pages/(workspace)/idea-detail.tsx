import type { Id } from '@groam/backend/data-model';
import { IdeaDetailView } from '@/features/ideas/idea-detail/idea-detail-view';
import { useParams } from '@/features/workspace/navigation/router';

export default function IdeaDetailPage() {
  const { proposalId = '' } = useParams<{ proposalId: string }>();
  return <IdeaDetailView proposalId={proposalId as Id<'tripProposals'>} />;
}
