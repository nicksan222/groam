import { assistantAgents } from '@groam/ai/agents';
import { Check } from '@groam/icons';
import { MenuRow } from '@groam/ui/components/menu-row';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger
} from '@groam/ui/components/popover';
import { shellCardHeaderVariants } from '@groam/ui/lib/shell-card';
import { type ReactNode, useState } from 'react';
import { IssueAssigneeAvatar } from '@/features/issues/shared/issue-assignee-avatar';
import { useWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { testIds } from '@/lib/test-ids';
import type { IssueAssigneeInput, IssueCardData } from '@/types/issues';

function isSameAssignee(current: IssueCardData['assignee'], option: IssueAssigneeInput) {
  if (current?.kind === 'user') return option.kind === 'user' && option.userId === current.userId;
  if (current?.kind === 'agent')
    return option.kind === 'agent' && option.agentId === current.agentId;
  return false;
}

function AssigneeRow({
  assignee,
  detail,
  me = false,
  onChoose,
  option,
  testId
}: {
  assignee: IssueCardData['assignee'];
  /** A second line under the name. */
  detail?: string;
  /** Names the viewer's own row "Me". */
  me?: boolean;
  onChoose: (next: IssueAssigneeInput | null) => void;
  option: IssueAssigneeInput;
  testId?: string;
}) {
  const assigned = isSameAssignee(assignee, option);
  return (
    <MenuRow
      aria-label={`${assigned ? 'Unassign' : 'Assign'} ${me ? 'me' : option.name}`}
      aria-pressed={assigned}
      data-testid={testId}
      onClick={() => onChoose(assigned ? null : option)}
    >
      <IssueAssigneeAvatar assignee={option} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{me ? 'Me' : option.name}</span>
        {detail ? <span className="block text-xs text-muted-foreground">{detail}</span> : null}
      </span>
      {assigned ? <Check className="size-4 text-muted-foreground" /> : null}
    </MenuRow>
  );
}

/**
 * Popover to assign an issue to a traveler or the Issue agent, or to unassign it. Suggests "Me" first. `children` is the trigger (rendered as-is via `asChild`); pass
 * `open`/`onOpenChange` to control it, for example to open it from a board card menu.
 */
export function IssueAssigneePicker({
  align = 'end',
  assignee,
  children,
  disabled = false,
  onAssign,
  onOpenChange,
  open: controlledOpen
}: {
  align?: 'center' | 'end' | 'start';
  assignee: IssueCardData['assignee'];
  children: ReactNode;
  disabled?: boolean;
  /** Called with the new assignee, or `null` to unassign. The popover closes afterwards. */
  onAssign: (assignee: IssueAssigneeInput | null) => void;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
}) {
  const { activeOrganization, session } = useWorkspace();
  const issueAgent = assistantAgents.issue;
  const people = activeOrganization.members.map((member): IssueAssigneeInput => ({
    kind: 'user',
    name: member.user.name,
    userId: member.userId
  }));
  const me = people.find((person) => person.kind === 'user' && person.userId === session.user.id);
  const others = people.filter((person) => person !== me);
  const agent: IssueAssigneeInput = {
    agentId: issueAgent.id,
    kind: 'agent',
    name: issueAgent.label
  };

  const [innerOpen, setInnerOpen] = useState(false);
  const open = controlledOpen ?? innerOpen;
  const changeOpen = (next: boolean) => {
    setInnerOpen(next);
    onOpenChange?.(next);
  };
  const choose = (next: IssueAssigneeInput | null) => {
    onAssign(next);
    changeOpen(false);
  };

  const rows = (
    <>
      {me ? (
        <AssigneeRow
          assignee={assignee}
          me
          onChoose={choose}
          option={me}
          testId={testIds.issueAssignMe}
        />
      ) : null}
      <AssigneeRow
        assignee={assignee}
        detail={isSameAssignee(assignee, agent) ? 'Assigned' : 'Works this issue'}
        onChoose={choose}
        option={agent}
        testId={testIds.issueAssignGroam}
      />
      {others.map((person) => (
        <AssigneeRow
          assignee={assignee}
          key={person.kind === 'user' ? person.userId : person.agentId}
          onChoose={choose}
          option={person}
        />
      ))}
    </>
  );
  const header = (
    <PopoverHeader className={shellCardHeaderVariants()}>
      <PopoverTitle>Assignees</PopoverTitle>
      <PopoverDescription>Assign a person or the Issue agent.</PopoverDescription>
    </PopoverHeader>
  );

  return (
    <Popover onOpenChange={changeOpen} open={open}>
      <PopoverTrigger asChild disabled={disabled}>
        {children}
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="max-h-(--radix-popover-content-available-height) w-72 overflow-x-hidden overflow-y-auto p-0"
        data-testid={testIds.issueAssigneePicker}
      >
        {header}
        {rows}
      </PopoverContent>
    </Popover>
  );
}
