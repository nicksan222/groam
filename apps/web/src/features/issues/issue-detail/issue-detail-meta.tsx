import { relativeIssueDate } from '@/features/issues/hooks/issue-relative-date';
import { useIssueMutations } from '@/features/issues/hooks/use-issue-mutations';
import { IssueLabelBadges } from '@/features/issues/shared/issue-label-badges';
import { IssueStatusSelect } from '@/features/issues/shared/issue-status-select';
import { useAsyncPending } from '@/features/workspace/hooks/use-async-pending';
import type { IssueDetailData } from './issue-detail-data';

/** Status control, labels, and the opened-by line. */
export function IssueDetailMeta({ issue }: { issue: IssueDetailData }) {
  const { setStatus } = useIssueMutations();
  const pending = useAsyncPending();
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <IssueStatusSelect
        canManage={issue.canManage}
        condition={issue.condition}
        disabled={pending.isPending}
        onChange={(status) => void pending.run(() => setStatus(issue.id, status))}
        status={issue.status}
      />
      <IssueLabelBadges labels={issue.labels} />
      <p className="min-w-0 truncate text-xs text-muted-foreground">
        opened by <span className="font-medium text-foreground">{issue.author.name}</span>
        {' · '}
        {relativeIssueDate(issue.updatedAt)}
      </p>
    </div>
  );
}
