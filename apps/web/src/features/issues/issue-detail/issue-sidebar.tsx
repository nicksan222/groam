import { assistantAgents } from '@groam/ai-contracts/agents/registry';
import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { DatePicker } from '@groam/ui/components/date-picker';
import { DetailSection } from '@groam/ui/components/detail-section';
import { GearPopover } from '@groam/ui/components/gear-popover';
import { MenuRow } from '@groam/ui/components/menu-row';
import { PopoverDescription, PopoverHeader, PopoverTitle } from '@groam/ui/components/popover';
import { initials } from '@groam/ui/lib/avatar';
import { shellCardHeaderVariants } from '@groam/ui/lib/shell-card';
import { Bot, Check, FileDiff } from 'lucide-react';
import { ideaCloneHref } from '@/features/ideas/idea-href';
import { startIdeaCta } from '@/features/ideas/idea-list/idea-page-copy';
import { Link } from '@/features/workspace/navigation/router';
import { useWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { testIds } from '@/lib/test-ids';
import type { IssueDetailData } from './issue-detail-data';

function dueAtToValue(dueAt: number): string {
  const date = new Date(dueAt);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function valueToDueAt(value: string): number {
  return new Date(`${value}T12:00:00`).getTime();
}

function AssigneeSection({
  issue,
  members,
  onAssignIssueAgent,
  onAssignUser,
  onUnassign,
  pending
}: {
  issue: IssueDetailData;
  members: ReturnType<typeof useWorkspace>['activeOrganization']['members'];
  onAssignIssueAgent: () => void;
  onAssignUser: (userId: string, name: string) => void;
  onUnassign: () => void;
  pending: boolean;
}) {
  const issueAgent = assistantAgents.issue;
  const issueAgentAssigned =
    issue.assignee?.kind === 'agent' && issue.assignee.agentId === issueAgent.id;
  const action = issue.canManage ? (
    <GearPopover disabled={pending} label="Edit assignees" testId={testIds.issueEditAssignees}>
      <PopoverHeader className={shellCardHeaderVariants()}>
        <PopoverTitle>Assignees</PopoverTitle>
        <PopoverDescription>Assign a person or the Issue agent.</PopoverDescription>
      </PopoverHeader>
      <MenuRow
        aria-label={
          issueAgentAssigned ? `Unassign ${issueAgent.label}` : `Assign ${issueAgent.label}`
        }
        aria-pressed={issueAgentAssigned}
        data-testid={testIds.issueAssignGroam}
        disabled={pending}
        onClick={issueAgentAssigned ? onUnassign : onAssignIssueAgent}
      >
        <span className="grid size-6 place-items-center rounded-full bg-muted text-muted-foreground">
          <Bot className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{issueAgent.label}</span>
          <span className="block text-xs text-muted-foreground">
            {issueAgentAssigned ? 'Assigned' : 'Works this issue'}
          </span>
        </span>
        {issueAgentAssigned ? <Check className="size-4 text-muted-foreground" /> : null}
      </MenuRow>
      {members.map((member) => {
        const assigned = issue.assignee?.kind === 'user' && issue.assignee.userId === member.userId;
        return (
          <MenuRow
            disabled={pending}
            key={member.userId}
            onClick={() =>
              assigned ? onUnassign() : onAssignUser(member.userId, member.user.name)
            }
          >
            <Avatar className="size-6">
              <AvatarFallback className="text-[9px]">{initials(member.user.name)}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate font-medium">{member.user.name}</span>
            {assigned ? <Check className="size-4 text-muted-foreground" /> : null}
          </MenuRow>
        );
      })}
    </GearPopover>
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
            <span className="grid size-5 place-items-center rounded-full bg-muted text-muted-foreground">
              <Bot className="size-3" />
            </span>
            <span className="min-w-0 truncate">{issue.assignee.name}</span>
          </Link>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <Avatar className="size-5">
              <AvatarFallback className="text-[8px]">
                {initials(issue.assignee.name)}
              </AvatarFallback>
            </Avatar>
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
  const dueValue = issue.dueAt == null ? '' : dueAtToValue(issue.dueAt);
  return (
    <DetailSection title="Decide by">
      {issue.canManage ? (
        <DatePicker
          disabled={pending}
          label="Decide by"
          onChange={(value) => onSetDueAt(value ? valueToDueAt(value) : null)}
          placeholder="Choose a date"
          testId={testIds.issueDecideBy}
          value={dueValue}
        />
      ) : (
        <p className="text-xs text-muted-foreground">
          {issue.dueAt ? new Date(issue.dueAt).toLocaleDateString() : 'No date yet'}
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
  const canStartIdea = issue.canManage && issue.status === 'open' && !issue.idea;
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
  onAssignIssueAgent,
  onAssignUser,
  onSetDueAt,
  onStartIdea,
  onUnassign,
  pending
}: {
  issue: IssueDetailData;
  onAssignIssueAgent: () => void;
  onAssignUser: (userId: string, name: string) => void;
  onSetDueAt: (dueAt: number | null) => void;
  onStartIdea: () => void;
  onUnassign: () => void;
  pending: boolean;
}) {
  const { activeOrganization } = useWorkspace();
  return (
    <div>
      <AssigneeSection
        issue={issue}
        members={activeOrganization.members}
        onAssignIssueAgent={onAssignIssueAgent}
        onAssignUser={onAssignUser}
        onUnassign={onUnassign}
        pending={pending}
      />
      <DueDateSection issue={issue} onSetDueAt={onSetDueAt} pending={pending} />
      <IdeaSection issue={issue} onStartIdea={onStartIdea} pending={pending} />
    </div>
  );
}
