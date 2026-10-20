import { Button } from '@groam/ui/components/button';
import { RecordListBadge } from '@groam/ui/components/record-list-badge';
import { RecordListItem } from '@groam/ui/components/record-list-item';
import { recordListTitleClassName } from '@groam/ui/lib/record-list';
import { GitPullRequest } from 'lucide-react';
import { ideaStatusLabel } from '@/features/ideas/idea-status';
import { relativeIssueDate } from '@/features/issues/hooks/issue-relative-date';
import { issueStatusMeta } from '@/features/issues/issue-status';
import { IssueAssigneeAvatar } from '@/features/issues/shared/issue-assignee-avatar';
import { IssueDueChip } from '@/features/issues/shared/issue-due-chip';
import { IssueStatusIcon } from '@/features/issues/shared/issue-status-icon';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import type { IssueListItem } from '@/types/issues';

import { IssueListConditionBadge } from './issue-list-condition-badge';

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
      data-issue-id={issue.id}
      data-issue-title={issue.title}
      data-status={issue.status}
      data-testid={testIds.issueRow}
      icon={<IssueStatusIcon className="text-muted-foreground" status={issue.status} />}
      title={
        onActivate ? (
          <Button className={recordListTitleClassName} onClick={() => onActivate(issue)} unstyled>
            {issue.title}
          </Button>
        ) : (
          <Link
            className={recordListTitleClassName}
            params={{ issueId: issue.id }}
            title={issue.title}
            to="/issues/$issueId"
          >
            {issue.title}
          </Link>
        )
      }
      metadata={<RecordListBadge>{issueStatusMeta[issue.status].label}</RecordListBadge>}
      description={
        <span className="min-w-0 truncate">
          {showTripName && issue.tripName ? (
            <>
              <span className="font-medium">{issue.tripName}</span>
              <span aria-hidden className="mx-1.5">
                ·
              </span>
            </>
          ) : null}
          opened by <span>{issue.author.name}</span>
          <span aria-hidden className="mx-1.5">
            ·
          </span>
          <time
            dateTime={new Date(issue.updatedAt).toISOString()}
            title={new Date(issue.updatedAt).toLocaleString()}
          >
            updated {relativeIssueDate(issue.updatedAt)}
          </time>
        </span>
      }
      badges={
        issue.condition || issue.labels.length || issue.dueAt != null || issue.idea ? (
          <>
            {issue.condition ? <IssueListConditionBadge condition={issue.condition} /> : null}
            {issue.labels.includes('mandatory') ? (
              <RecordListBadge>Mandatory</RecordListBadge>
            ) : null}
            {issue.dueAt != null ? (
              <IssueDueChip dueAt={issue.dueAt} status={issue.status} />
            ) : null}
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
          </>
        ) : undefined
      }
      trailing={
        issue.assignee ? <IssueAssigneeAvatar assignee={issue.assignee} labelled /> : undefined
      }
    />
  );
}
