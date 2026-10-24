import Shell from '@groam/ui/components/shell/client';
import Timeline from '@groam/ui/components/timeline';
import { useMediaQuery } from '@groam/ui/hooks/use-media-query';
import { ideaCloneHref } from '@/features/ideas/idea-href';
import { useIssueMutations } from '@/features/issues/hooks/use-issue-mutations';
import type { useTripIssue } from '@/features/trips/hooks/use-trip-issues';
import { useAsyncPending } from '@/features/workspace/hooks/use-async-pending';
import { useNavigate } from '@/lib/navigation/router';
import type { IssueAssigneeInput } from '@/types/issues';
import { groupIssueTimeline } from './group-issue-timeline';
import { IssueAutoStatusEvent } from './issue-auto-status-event';
import { IssueComment } from './issue-comment';
import { IssueComposer } from './issue-composer';
import type { IssueDetailData } from './issue-detail-data';
import { IssueProperties } from './issue-properties';
import { IssueSidebar } from './issue-sidebar';
import { IssueSystemEvent } from './issue-system-event';

/** Timeline and sidebar for a loaded issue; the page owns the subscription and passes it down. */
export function IssueDetail({
  addComment,
  implement,
  issue,
  setCondition,
  setDueAt
}: Omit<ReturnType<typeof useTripIssue>, 'issue'> & { issue: IssueDetailData }) {
  const { assign } = useIssueMutations();
  const navigate = useNavigate();
  const pending = useAsyncPending();
  // The two columns start at `xl` (Tailwind's 80rem); below it the triage facts lead the page.
  const sideBySide = useMediaQuery('(min-width: 80rem)');

  const startIdea = async () => {
    const version = await pending.run(async () => implement());
    if (version) {
      void navigate(ideaCloneHref({ id: version.proposalId, sourceTripId: issue.tripId }));
    }
  };

  const timeline = (
    <Timeline clipSidebar variant="activity">
      <IssueComment
        authorName={issue.author.name}
        body={issue.body}
        opening
        timestamp={issue.updatedAt}
      />
      {groupIssueTimeline(issue.comments).map((block) =>
        block.kind === 'auto' ? (
          <IssueAutoStatusEvent
            change={block.auto.change}
            key={block.item.id}
            label={block.auto.label}
            timestamp={block.item.createdAt}
          />
        ) : block.kind === 'system' ? (
          <IssueSystemEvent
            events={block.items.map(({ event, item }) => ({
              actorName: item.author.name,
              event,
              id: item.id,
              message: item.content,
              timestamp: item.createdAt
            }))}
            key={block.items[0]?.item.id}
          />
        ) : (
          <IssueComment
            authorName={block.item.author.name}
            body={block.item.content}
            key={block.item.id}
            timestamp={block.item.createdAt}
          />
        )
      )}
      {issue.canComment ? <IssueComposer onComment={addComment} /> : null}
    </Timeline>
  );
  const handlers = {
    issue,
    onAssign: (assignee: IssueAssigneeInput | null) =>
      void pending.run(() => assign(issue.id, assignee)),
    onSetCondition: setCondition,
    onSetDueAt: (dueAt: number | null) => void pending.run(() => setDueAt(dueAt)),
    pending: pending.isPending
  };
  const sidebar = (
    <IssueSidebar
      {...handlers}
      layout={sideBySide ? 'full' : 'reference'}
      onStartIdea={() => void startIdea()}
    />
  );

  return (
    <Shell.TwoColumns>
      <Shell.LeftColumn as="main">
        {sideBySide ? null : <IssueProperties {...handlers} />}
        {timeline}
      </Shell.LeftColumn>
      <Shell.RightColumn>{sidebar}</Shell.RightColumn>
    </Shell.TwoColumns>
  );
}
