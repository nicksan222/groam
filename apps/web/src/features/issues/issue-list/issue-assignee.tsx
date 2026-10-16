import { IssueAssigneeAvatar } from '@/features/issues/shared/issue-assignee-avatar';
import type { IssueCardData } from '@/types/issues';

export function IssueAssignee({ assignee }: { assignee: IssueCardData['assignee'] }) {
  const name = assignee?.name ?? 'Unassigned';
  return (
    <span className="flex min-w-0 items-center gap-2" title={name}>
      <span aria-hidden className="contents">
        <IssueAssigneeAvatar assignee={assignee} />
      </span>
      <span className="min-w-0 truncate text-muted-foreground">{name}</span>
    </span>
  );
}
