import type { Id } from '@groam/backend/data-model';
import { IssueDetailView } from '@/features/issues/issue-detail/issue-detail-view';
import { useParams } from '@/features/workspace/navigation/router';

export default function IssueDetailPage() {
  const { issueId = '' } = useParams<{ issueId: string }>();
  return <IssueDetailView issueId={issueId as Id<'tripIssues'>} />;
}
