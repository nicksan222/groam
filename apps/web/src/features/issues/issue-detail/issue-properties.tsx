import { testIds } from '@/lib/test-ids';
import type { IssueAssigneeInput, IssueConditionInput } from '@/types/issues';
import { IssueAboutSection } from './issue-about-section';
import { IssueAssigneeSection } from './issue-assignee-section';
import { IssueConditionSection } from './issue-condition-section';
import type { IssueDetailData } from './issue-detail-data';
import { IssueDueDateSection } from './issue-due-date-section';

/**
 * The issue's triage facts as a compact block above the conversation, for screens narrower than
 * the two-column layout: who, by when, then the "done when" rule and what it is about. The same
 * sections the desktop sidebar shows, in a tight two-column grid.
 */
export function IssueProperties({
  issue,
  onAssign,
  onSetCondition,
  onSetDueAt,
  pending
}: {
  issue: IssueDetailData;
  onAssign: (assignee: IssueAssigneeInput | null) => void;
  onSetCondition?: (input: IssueConditionInput) => Promise<boolean>;
  onSetDueAt: (dueAt: number | null) => void;
  pending: boolean;
}) {
  return (
    <div className="space-y-3" data-testid={testIds.issueProperties}>
      <div className="grid grid-cols-2 gap-x-4">
        <IssueAssigneeSection compact issue={issue} onAssign={onAssign} pending={pending} />
        <IssueDueDateSection compact issue={issue} onSetDueAt={onSetDueAt} pending={pending} />
      </div>
      <IssueConditionSection
        canEdit={issue.canManage}
        compact
        condition={issue.condition}
        onSave={onSetCondition}
      />
      <IssueAboutSection compact issue={issue} />
    </div>
  );
}
