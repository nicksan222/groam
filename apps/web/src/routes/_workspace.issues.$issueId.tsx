import type { Id } from '@groam/backend/data-model';
import { createFileRoute } from '@tanstack/react-router';
import { IssueDetailView } from '@/features/issues/issue-detail/issue-detail-view';
import { useResolvedParams } from '@/features/workspace/hooks/reference-context';

export const Route = createFileRoute('/_workspace/issues/$issueId')({
  component: IssueDetailPage
});

function IssueDetailPage() {
  const { issueId } = useResolvedParams(Route.useParams());
  return <IssueDetailView issueId={issueId as Id<'tripIssues'>} />;
}
