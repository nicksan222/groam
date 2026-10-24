import { isResolved } from '@groam/backend/convex/modules/travel/issues/status';
import { FileDiff } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { DetailSection } from '@groam/ui/components/detail-section';
import { ideaCloneHref } from '@/features/ideas/idea-href';
import { LinkedResearches } from '@/features/research/research-links/linked-researches';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import type { IssueAssigneeInput, IssueConditionInput } from '@/types/issues';
import { IssueAboutSection } from './issue-about-section';
import { IssueAssigneeSection } from './issue-assignee-section';
import { IssueConditionSection } from './issue-condition-section';
import type { IssueDetailData } from './issue-detail-data';
import { IssueDueDateSection } from './issue-due-date-section';

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
    <DetailSection title="Idea">
      {issue.idea && ideaHref ? (
        <Link
          className="flex items-start gap-2 text-left"
          data-testid={testIds.issueLinkedIdea}
          params={ideaHref.params}
          search={ideaHref.search}
          to={ideaHref.to}
        >
          <FileDiff className="mt-1 size-4 shrink-0 text-muted-foreground" />
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
        <p className="text-xs text-muted-foreground">
          <span>None yet</span>
          {canStartIdea ? (
            <>
              {' · '}
              <Button
                className="h-auto p-0 text-xs underline-offset-4 hover:underline"
                data-testid={testIds.issueStartIdea}
                disabled={pending}
                onClick={onStartIdea}
                type="button"
                variant="link"
              >
                Start an idea
              </Button>
            </>
          ) : null}
        </p>
      )}
    </DetailSection>
  );
}

/**
 * The issue's right-hand column. `full` is every section (from `xl`, where the column sits beside
 * the conversation); `reference` is only the links out (Idea, Research), for narrower screens where
 * the triage facts already sit above the conversation (`IssueProperties`).
 */
export function IssueSidebar({
  issue,
  layout = 'full',
  onAssign,
  onSetCondition,
  onSetDueAt,
  onStartIdea,
  pending
}: {
  issue: IssueDetailData;
  layout?: 'full' | 'reference';
  onAssign: (assignee: IssueAssigneeInput | null) => void;
  onSetCondition?: (input: IssueConditionInput) => Promise<boolean>;
  onSetDueAt: (dueAt: number | null) => void;
  onStartIdea: () => void;
  pending: boolean;
}) {
  return (
    <div>
      {layout === 'full' ? (
        <>
          <IssueAboutSection issue={issue} />
          <IssueAssigneeSection issue={issue} onAssign={onAssign} pending={pending} />
          <IssueDueDateSection issue={issue} onSetDueAt={onSetDueAt} pending={pending} />
          <IssueConditionSection
            canEdit={issue.canManage}
            condition={issue.condition}
            onSave={onSetCondition}
          />
        </>
      ) : null}
      <IdeaSection issue={issue} onStartIdea={onStartIdea} pending={pending} />
      <LinkedResearches target={{ id: issue.id, kind: 'issue' }} tripId={issue.tripId} />
    </div>
  );
}
