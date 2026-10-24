import { Settings2 } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { DetailSection } from '@groam/ui/components/detail-section';
import { IssueAssigneeAvatar } from '@/features/issues/shared/issue-assignee-avatar';
import { IssueAssigneePicker } from '@/features/issues/shared/issue-assignee-picker';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import type { IssueAssigneeInput } from '@/types/issues';
import type { IssueDetailData } from './issue-detail-data';

export function IssueAssigneeSection({
  compact,
  issue,
  onAssign,
  pending
}: {
  compact?: boolean;
  issue: IssueDetailData;
  onAssign: (assignee: IssueAssigneeInput | null) => void;
  pending: boolean;
}) {
  const action = issue.canAssign ? (
    <IssueAssigneePicker assignee={issue.assignee} disabled={pending} onAssign={onAssign}>
      <Button
        aria-label="Edit assignees"
        className="-mr-2 text-muted-foreground hover:text-foreground"
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
    <DetailSection action={action} compact={compact} title="Assignees">
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
