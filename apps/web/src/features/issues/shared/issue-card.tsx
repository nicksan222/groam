import { isResolved } from '@groam/backend/convex/modules/travel/issues/status';
import { Sparkles } from '@groam/icons';
import {
  cardChip,
  cardMetaRow,
  cardStretchedLink,
  cardSurface,
  cardTitle
} from '@groam/ui/lib/board-card';
import { cn } from '@groam/ui/lib/utils';
import type { ComponentProps, ReactNode } from 'react';
import { IssueAssigneeAvatar } from '@/features/issues/shared/issue-assignee-avatar';
import { IssueConditionLine } from '@/features/issues/shared/issue-condition-line';
import { IssueDueChip } from '@/features/issues/shared/issue-due-chip';
import { IssueLabelMarks } from '@/features/issues/shared/issue-label-marks';
import { IssueStatusBar } from '@/features/issues/shared/issue-status-bar';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import type { IssueCardData } from '@/types/issues';

/** The linked idea's stage in a few words; the full title rides on the chip's tooltip. */
const ideaChipText = {
  closed: 'Idea closed',
  conflicted: 'Idea needs update',
  draft: 'Idea drafted',
  in_review: 'Idea in review',
  merged: 'Idea applied'
} as const;

/**
 * Compact presentation of one issue for boards and lists: a top row with a Trello-style status bar
 * and the assignee, the title, then a row of lozenges. The title is the single
 * click target and stretches over the card as a link to the full page. The assignee sits above
 * that target so it stays clickable: in the top row by default, revealed on hover or focus with
 * `hover`, or among the chips with `chips`.
 */
export function IssueCard({
  assigneeAt = 'avatar',
  assigneeSlot,
  className,
  ideaChipClassName,
  issue,
  ...props
}: Omit<ComponentProps<'article'>, 'children' | 'title'> & {
  assigneeAt?: 'avatar' | 'chips' | 'hover';
  /** Replaces the assignee avatar, for example with an `IssueAssigneePicker` trigger. */
  assigneeSlot?: ReactNode;
  /** Tints the linked-idea chip, for example to pair it with its idea card on a board. */
  ideaChipClassName?: string;
  issue: IssueCardData;
}) {
  const assignee =
    assigneeSlot ??
    (issue.assignee ? (
      <IssueAssigneeAvatar assignee={issue.assignee} className="size-5" labelled />
    ) : null);
  return (
    <article
      className={cn(cardSurface, 'group/issue-card flex flex-col gap-2', className)}
      data-issue-id={issue.id}
      data-status={issue.status}
      data-testid={testIds.issueCard}
      {...props}
    >
      <div className="flex min-h-5 items-center justify-between gap-2">
        <IssueStatusBar status={issue.status} />
        {assigneeAt === 'chips' || !assignee ? null : (
          <div
            className={cn(
              'relative z-10 -my-1',
              assigneeAt === 'hover' &&
                'opacity-0 transition-opacity focus-within:opacity-100 group-focus-within/issue-card:opacity-100 group-hover/issue-card:opacity-100 has-data-[state=open]:opacity-100'
            )}
          >
            {assignee}
          </div>
        )}
      </div>
      <Link
        className={cn(
          cardTitle,
          'text-left',
          isResolved(issue.status) &&
            'text-muted-foreground line-through decoration-muted-foreground/50',
          cardStretchedLink
        )}
        params={{ issueId: issue.id }}
        to="/issues/$issueId"
      >
        {issue.title}
      </Link>
      <div className={cardMetaRow}>
        <IssueLabelMarks labels={issue.labels} />
        {issue.condition ? <IssueConditionLine condition={issue.condition} /> : null}
        {issue.dueAt === null ? null : <IssueDueChip dueAt={issue.dueAt} status={issue.status} />}
        {issue.idea ? (
          <span className={cn(cardChip, ideaChipClassName)}>
            <Sparkles aria-hidden />
            <span className="truncate" title={issue.idea.title}>
              {ideaChipText[issue.idea.status]}
            </span>
          </span>
        ) : null}
        {assigneeAt === 'chips' ? <div className="relative z-10">{assignee}</div> : null}
      </div>
    </article>
  );
}
