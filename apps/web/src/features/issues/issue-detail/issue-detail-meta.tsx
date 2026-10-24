import { SHELL_HEADER_FACT } from '@groam/ui/lib/shell-layout';
import { useIssueMutations } from '@/features/issues/hooks/use-issue-mutations';
import { IssueDueChip } from '@/features/issues/shared/issue-due-chip';
import { IssueLabelBadges } from '@/features/issues/shared/issue-label-badges';
import { IssueStatusSelect } from '@/features/issues/shared/issue-status-select';
import { useAsyncPending } from '@/features/workspace/hooks/use-async-pending';
import type { IssueDetailData } from './issue-detail-data';

/**
 * The issue header's facts line: the status control, its labels and when it is due, as one group of
 * controls (no dot between a control and a chip). Who opened it is the timeline's first entry.
 */
export function IssueDetailMeta({ issue }: { issue: IssueDetailData }) {
  const { setStatus } = useIssueMutations();
  const pending = useAsyncPending();
  return (
    <span className={SHELL_HEADER_FACT}>
      <span className="inline-flex items-center gap-2">
        <IssueStatusSelect
          canManage={issue.canManage}
          condition={issue.condition}
          disabled={pending.isPending}
          onChange={(status) => void pending.run(() => setStatus(issue.id, status))}
          status={issue.status}
        />
        <IssueLabelBadges labels={issue.labels} />
        {issue.dueAt === null ? null : <IssueDueChip dueAt={issue.dueAt} status={issue.status} />}
      </span>
    </span>
  );
}
