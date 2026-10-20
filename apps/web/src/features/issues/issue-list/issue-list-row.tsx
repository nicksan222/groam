import { Clock3, GitPullRequest, MapPin, UserRound } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { RecordListBadge } from '@groam/ui/components/record-list-badge';
import { RecordListItem } from '@groam/ui/components/record-list-item';
import { recordListWrappedTitleClassName } from '@groam/ui/lib/record-list';
import { ideaStatusLabel } from '@/features/ideas/idea-status';
import { relativeIssueDate } from '@/features/issues/hooks/issue-relative-date';
import { issueStatusMeta } from '@/features/issues/issue-status';
import { IssueAssigneeAvatar } from '@/features/issues/shared/issue-assignee-avatar';
import { IssueDueChip } from '@/features/issues/shared/issue-due-chip';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import type { IssueListItem } from '@/types/issues';

import { IssueListConditionBadge } from './issue-list-condition-badge';

const statusBadgeClassName = {
  closed: 'border-success/25 bg-success/10 text-success-foreground',
  in_progress: 'border-warning/25 bg-warning/10 text-warning-foreground',
  open: 'border-info/25 bg-info/10 text-info-foreground',
  wont_do: ''
} as const satisfies Record<IssueListItem['status'], string>;

export function IssueListRow({
  issue,
  onActivate,
  showTripName
}: {
  issue: IssueListItem;
  onActivate?: (issue: IssueListItem) => void;
  showTripName: boolean;
}) {
  return (
    <RecordListItem
      wrapTitle
      data-issue-id={issue.id}
      data-issue-title={issue.title}
      data-status={issue.status}
      data-testid={testIds.issueRow}
      title={
        onActivate ? (
          <Button
            className={recordListWrappedTitleClassName}
            onClick={() => onActivate(issue)}
            unstyled
          >
            {issue.title}
          </Button>
        ) : (
          <Link
            className={recordListWrappedTitleClassName}
            params={{ issueId: issue.id }}
            title={issue.title}
            to="/issues/$issueId"
          >
            {issue.title}
          </Link>
        )
      }
      metadata={
        <RecordListBadge className={statusBadgeClassName[issue.status]}>
          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />
          {issueStatusMeta[issue.status].label}
        </RecordListBadge>
      }
      description={
        <span className="flex h-6 min-w-0 items-center gap-1.5">
          {showTripName && issue.tripName ? (
            <RecordListBadge className="min-w-0 max-w-[50%] shrink gap-1.5" title={issue.tripName}>
              <MapPin aria-hidden className="shrink-0" />
              <span className="truncate">{issue.tripName}</span>
            </RecordListBadge>
          ) : null}
          <RecordListBadge
            className="min-w-0 shrink gap-1.5"
            title={`Opened by ${issue.author.name}`}
          >
            <UserRound aria-hidden className="shrink-0" />
            <span className="truncate">
              <span className="sr-only">opened by </span>
              <span>{issue.author.name}</span>
            </span>
          </RecordListBadge>
          <RecordListBadge className="hidden shrink-0 gap-1.5 @xl/record:inline-flex">
            <Clock3 aria-hidden />
            <time
              dateTime={new Date(issue.updatedAt).toISOString()}
              title={new Date(issue.updatedAt).toLocaleString()}
            >
              updated {relativeIssueDate(issue.updatedAt)}
            </time>
          </RecordListBadge>
        </span>
      }
      badges={
        <>
          {issue.condition ? <IssueListConditionBadge condition={issue.condition} /> : null}
          {issue.labels.includes('mandatory') ? <RecordListBadge>Mandatory</RecordListBadge> : null}
          {issue.dueAt != null ? <IssueDueChip dueAt={issue.dueAt} status={issue.status} /> : null}
          {issue.idea ? (
            <Link
              aria-label={`Open linked idea: ${issue.idea.title}`}
              className="relative z-10 hidden items-center gap-1 md:inline-flex underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring"
              params={{ proposalId: issue.idea.id }}
              title={issue.idea.title}
              to="/ideas/$proposalId"
            >
              <RecordListBadge className="gap-1.5">
                <GitPullRequest aria-hidden />
                Idea: {ideaStatusLabel(issue.idea.status)}
              </RecordListBadge>
            </Link>
          ) : null}
          {issue.assignee ? (
            <span className="ml-2 hidden @md/record:inline-flex">
              <IssueAssigneeAvatar assignee={issue.assignee} labelled />
            </span>
          ) : null}
        </>
      }
    />
  );
}
