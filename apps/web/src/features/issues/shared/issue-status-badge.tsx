import { Badge } from '@groam/ui/components/badge';
import { issueStatusMeta } from '@/features/issues/issue-status';
import { IssueStatusIcon } from '@/features/issues/shared/issue-status-icon';
import type { IssueStatus } from '@/types/issues';

/** Read-only status chip; pass `testId` where the status must be addressable. */
export function IssueStatusBadge({ status, testId }: { status: IssueStatus; testId?: string }) {
  return (
    <Badge data-status={status} data-testid={testId} variant="outline">
      <IssueStatusIcon className="size-3" status={status} />
      {issueStatusMeta[status].label}
    </Badge>
  );
}
