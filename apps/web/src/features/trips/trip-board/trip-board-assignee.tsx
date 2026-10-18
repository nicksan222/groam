import { Button } from '@groam/ui/components/button';
import { useIssueMutations } from '@/features/issues/hooks/use-issue-mutations';
import { IssueAssigneeAvatar } from '@/features/issues/shared/issue-assignee-avatar';
import { IssueAssigneePicker } from '@/features/issues/shared/issue-assignee-picker';
import { testIds } from '@/lib/test-ids';
import type { TripBoardIssue } from '@/types/trip-board';

/** The assignee control of a card the viewer can assign: the avatar as the picker trigger. */
export function TripBoardAssignee({ issue }: { issue: TripBoardIssue }) {
  const { assign } = useIssueMutations();
  const label = issue.assignee ? `Assigned to ${issue.assignee.name}` : 'Assign someone';
  return (
    <IssueAssigneePicker
      assignee={issue.assignee}
      onAssign={(assignee) => void assign(issue.id, assignee)}
    >
      <Button
        aria-label={label}
        className="rounded-full"
        data-testid={testIds.tripBoardAssign}
        size="icon-xs"
        variant="ghost"
      >
        <IssueAssigneeAvatar assignee={issue.assignee} className="size-5" />
      </Button>
    </IssueAssigneePicker>
  );
}
