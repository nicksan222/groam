import { isResolved } from '@groam/backend/convex/modules/travel/issues/status';
import { Button } from '@groam/ui/components/button';
import { DatePicker } from '@groam/ui/components/date-picker';
import { DetailSection } from '@groam/ui/components/detail-section';
import { GearPopover } from '@groam/ui/components/gear-popover';
import { MenuRow } from '@groam/ui/components/menu-row';
import { PopoverDescription, PopoverHeader, PopoverTitle } from '@groam/ui/components/popover';
import { dateFromString, displayDate, stringFromDate } from '@groam/ui/lib/calendar-date';
import { shellCardHeaderVariants } from '@groam/ui/lib/shell-card';
import { FileDiff, Settings2 } from 'lucide-react';
import { ideaCloneHref } from '@/features/ideas/idea-href';
import { startIdeaCta } from '@/features/ideas/idea-list/idea-page-copy';
import { IssueAssigneeAvatar } from '@/features/issues/shared/issue-assignee-avatar';
import { IssueAssigneePicker } from '@/features/issues/shared/issue-assignee-picker';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import type { IssueAssigneeInput } from '@/types/issues';
import { IssueConditionSection } from './issue-condition-section';
import type { IssueDetailData } from './issue-detail-data';

function dueAtFromValue(value: string | null): number | null {
  const date = value ? dateFromString(value) : undefined;
  return date ? date.setHours(12) : null;
}

function AssigneeSection({
  issue,
  onAssign,
  pending
}: {
  issue: IssueDetailData;
  onAssign: (assignee: IssueAssigneeInput | null) => void;
  pending: boolean;
}) {
  const action = issue.canAssign ? (
    <IssueAssigneePicker assignee={issue.assignee} disabled={pending} onAssign={onAssign}>
      <Button
        aria-label="Edit assignees"
        className="-mr-1.5 text-muted-foreground hover:text-foreground"
        data-testid={testIds.issueEditAssignees}
        disabled={pending}
        size="icon-xs"
        variant="ghost"
      >
        <Settings2 />
      </Button>
    </IssueAssigneePicker>
  ) : null;
  return (
    <DetailSection action={action} title="Assignees">
      {issue.assignee ? (
        issue.assignee.kind === 'agent' ? (
          <Link
            className="flex min-w-0 items-center gap-2 text-sm font-medium hover:underline"
            params={{ agentId: issue.assignee.agentId }}
            to="/agents/$agentId"
          >
            <IssueAssigneeAvatar assignee={issue.assignee} className="size-5" />
            <span className="min-w-0 truncate">{issue.assignee.name}</span>
          </Link>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <IssueAssigneeAvatar assignee={issue.assignee} className="size-5" />
            <span className="min-w-0 truncate font-medium">{issue.assignee.name}</span>
          </div>
        )
      ) : (
        <p className="text-xs text-muted-foreground">No one</p>
      )}
    </DetailSection>
  );
}

function DueDateSection({
  issue,
  onSetDueAt,
  pending
}: {
  issue: IssueDetailData;
  onSetDueAt: (dueAt: number | null) => void;
  pending: boolean;
}) {
  return (
    <DetailSection title="Decide by">
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
    </DetailSection>
  );
}

function IdeaSection({
  issue,
  onStartIdea,
  pending
}: {
  issue: IssueDetailData;
  onStartIdea: () => void;
  pending: boolean;
}) {
  const canStartIdea = issue.canManage && !isResolved(issue.status) && !issue.idea;
  const ideaHref = issue.idea
    ? ideaCloneHref(
        { id: issue.idea.id, sourceTripId: issue.tripId },
        issue.idea.status === 'draft' ? 'overview' : 'compare'
      )
    : null;
  return (
    <DetailSection
      action={
        canStartIdea ? (
          <GearPopover disabled={pending} label="Edit idea" testId={testIds.issueEditIdea}>
            <PopoverHeader className={shellCardHeaderVariants()}>
              <PopoverTitle>Idea</PopoverTitle>
              <PopoverDescription>
                Start an idea from this issue. You edit an idea; the shared trip stays as it is.
              </PopoverDescription>
            </PopoverHeader>
            <MenuRow
              aria-label={startIdeaCta}
              data-testid={testIds.issueStartIdea}
              disabled={pending}
              onClick={onStartIdea}
            >
              <FileDiff className="size-4 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{startIdeaCta}</span>
                <span className="block text-xs text-muted-foreground">
                  Copies the trip. The shared trip stays put.
                </span>
              </span>
            </MenuRow>
          </GearPopover>
        ) : null
      }
      title="Idea"
    >
      {issue.idea && ideaHref ? (
        <Link
          className="flex items-start gap-2 text-left"
          data-testid={testIds.issueLinkedIdea}
          params={ideaHref.params}
          search={ideaHref.search}
          to={ideaHref.to}
        >
          <FileDiff className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium hover:underline">
              {issue.idea.title}
            </span>
            <span className="block text-xs capitalize text-muted-foreground">
              {issue.idea.status.replace(/_/gu, ' ')}
            </span>
          </span>
        </Link>
      ) : (
        <p className="text-xs text-muted-foreground">None yet</p>
      )}
    </DetailSection>
  );
}

export function IssueSidebar({
  issue,
  onAssign,
  onSetDueAt,
  onStartIdea,
  pending
}: {
  issue: IssueDetailData;
  onAssign: (assignee: IssueAssigneeInput | null) => void;
  onSetDueAt: (dueAt: number | null) => void;
  onStartIdea: () => void;
  pending: boolean;
}) {
  return (
    <div>
      <AssigneeSection issue={issue} onAssign={onAssign} pending={pending} />
      <DueDateSection issue={issue} onSetDueAt={onSetDueAt} pending={pending} />
      <IssueConditionSection condition={issue.condition} />
      <IdeaSection issue={issue} onStartIdea={onStartIdea} pending={pending} />
    </div>
  );
}
