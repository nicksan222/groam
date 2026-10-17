import Shell from '@groam/ui/components/shell/client';
import Timeline from '@groam/ui/components/timeline';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { ideaCloneHref } from '@/features/ideas/idea-href';
import { useIssueMutations } from '@/features/issues/hooks/use-issue-mutations';
import type { useTripIssue } from '@/features/trips/hooks/use-trip-issues';
import { useAsyncPending } from '@/features/workspace/hooks/use-async-pending';
import { groupIssueTimeline } from './group-issue-timeline';
import { IssueAutoStatusEvent } from './issue-auto-status-event';
import { IssueComment } from './issue-comment';
import { IssueComposer } from './issue-composer';
import type { IssueDetailData } from './issue-detail-data';
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
  const [content, setContent] = useState('');
  const pending = useAsyncPending();

  const comment = async () => {
    const value = content.trim();
    if (!value) return;
    if (await pending.run(() => addComment(value))) {
      // Keep anything typed while the comment was sending.
      setContent((current) => (current.trim() === value ? '' : current));
    }
  };
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
        isAuthor
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
      {issue.canComment ? (
        <IssueComposer
          content={content}
          onChange={setContent}
          onComment={() => void comment()}
          pending={pending.isPending}
        />
      ) : null}
    </Timeline>
  );
  const sidebar = (
    <IssueSidebar
      issue={issue}
      onAssign={(assignee) => void pending.run(() => assign(issue.id, assignee))}
      onSetCondition={setCondition}
      onSetDueAt={(dueAt) => void pending.run(() => setDueAt(dueAt))}
      onStartIdea={() => void startIdea()}
      pending={pending.isPending}
    />
  );

  return (
    <Shell.TwoColumns>
      <Shell.LeftColumn as="main">{timeline}</Shell.LeftColumn>
      <Shell.RightColumn>{sidebar}</Shell.RightColumn>
    </Shell.TwoColumns>
  );
}
