import { isResolved } from '@groam/backend/convex/modules/travel/issues/status';
import { DatePicker } from '@groam/ui/components/date-picker';
import { DetailSection } from '@groam/ui/components/detail-section';
import { dateFromString, displayDate, stringFromDate } from '@groam/ui/lib/calendar-date';
import { IssueDueChip } from '@/features/issues/shared/issue-due-chip';
import { testIds } from '@/lib/test-ids';
import type { IssueDetailData } from './issue-detail-data';

function dueAtFromValue(value: string | null): number | null {
  const date = value ? dateFromString(value) : undefined;
  return date ? date.setHours(12) : null;
}

export function IssueDueDateSection({
  compact,
  issue,
  onSetDueAt,
  pending
}: {
  compact?: boolean;
  issue: IssueDetailData;
  onSetDueAt: (dueAt: number | null) => void;
  pending: boolean;
}) {
  return (
    <DetailSection compact={compact} title="Decide by">
      {issue.canManage ? (
        <DatePicker
          disabled={pending}
          label="Decide by"
          onChange={(value) => onSetDueAt(dueAtFromValue(value))}
          placeholder="Choose a date"
          testId={testIds.issueDecideBy}
          value={issue.dueAt === null ? '' : stringFromDate(new Date(issue.dueAt))}
        />
      ) : (
        <p className="text-xs text-muted-foreground">
          {issue.dueAt === null ? 'No date yet' : displayDate.format(issue.dueAt)}
        </p>
      )}
      {issue.dueAt !== null && issue.dueAt < Date.now() && !isResolved(issue.status) ? (
        <IssueDueChip dueAt={issue.dueAt} showDate={false} status={issue.status} />
      ) : null}
    </DetailSection>
  );
}
