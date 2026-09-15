import type { Id } from '@groam/backend/data-model';
import Shell from '@groam/ui/components/shell/client';
import { Skeleton } from '@groam/ui/components/skeleton';
import Timeline from '@groam/ui/components/timeline';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { ideaCloneHref } from '@/features/ideas/idea-href';
import { useTripIssue } from '@/features/trips/hooks/use-trip-issues';
import { useAsyncPending } from '@/features/workspace/hooks/use-async-pending';
import { groupIssueTimeline } from './group-issue-timeline';
import { IssueComment } from './issue-comment';
import { IssueComposer } from './issue-composer';
import { IssueSidebar } from './issue-sidebar';
import { IssueSystemEvent } from './issue-system-event';

export function IssueDetail({
  issueId,
  isLoading = false
}: {
  issueId: Id<'tripIssues'>;
  isLoading?: boolean;
}) {
  const {
    addComment,
    assignIssueAgent,
    assignUser,
    implement,
    issue,
    setDueAt,
    setStatus,
    unassign
  } = useTripIssue(issueId);
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const pending = useAsyncPending();

  if (isLoading) {
    return (
      <Shell.TwoColumns>
        <Shell.LeftColumn as="main">
          <Timeline clipSidebar variant="activity">
            <Timeline.Item>
              <Timeline.Badge aria-hidden>
                <Skeleton className="size-3 rounded-full" />
              </Timeline.Badge>
              <Timeline.Body>
                <Timeline.Card>
                  <Timeline.CardBody className="space-y-2">
                    <Skeleton className="h-4 w-full max-w-lg" />
                    <Skeleton className="h-4 w-full max-w-md" />
                    <Skeleton className="h-4 w-2/3 max-w-sm" />
                  </Timeline.CardBody>
                </Timeline.Card>
              </Timeline.Body>
            </Timeline.Item>
          </Timeline>
          <div className="mt-4 rounded-xl border border-border p-3">
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        </Shell.LeftColumn>
        <Shell.RightColumn>
          <div className="space-y-6">
            {['Assignees', 'Decide by', 'Idea'].map((title) => (
              <div className="space-y-2" key={title}>
                <h3 className="text-sm font-medium text-foreground">{title}</h3>
                <Skeleton className="h-9 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </Shell.RightColumn>
      </Shell.TwoColumns>
    );
  }

  if (!issue) return null;

  const run = async (action: () => Promise<boolean>) => {
    return pending.run(action);
  };
  const comment = async () => {
    const value = content.trim();
    if (!value) return;
    if (await run(() => addComment(value))) setContent('');
  };
  const startIdea = async () => {
    const version = await pending.run(async () => implement());
    if (version) {
      void navigate(ideaCloneHref({ id: version.proposalId, sourceTripId: issue.tripId }));
    }
  };

  return (
    <Shell.TwoColumns>
      <Shell.LeftColumn as="main">
        <Timeline clipSidebar variant="activity">
          <IssueComment
            authorName={issue.author.name}
            body={issue.body}
            isAuthor
            timestamp={issue.updatedAt}
          />
          {groupIssueTimeline(issue.comments).map((block) =>
            block.kind === 'system' ? (
              <IssueSystemEvent
                events={block.items.map((item) => ({
                  id: item.id,
                  message: item.content,
                  timestamp: item.createdAt
                }))}
                key={block.items[0]?.id}
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
          <IssueComposer
            canManage={issue.canManage}
            content={content}
            onChange={setContent}
            onComment={() => void comment()}
            onToggleStatus={() =>
              void run(() => setStatus(issue.status === 'open' ? 'closed' : 'open'))
            }
            pending={pending.isPending}
            status={issue.status}
          />
        </Timeline>
      </Shell.LeftColumn>
      <Shell.RightColumn>
        <IssueSidebar
          issue={issue}
          onAssignIssueAgent={() => void run(assignIssueAgent)}
          onAssignUser={(userId, name) => void run(() => assignUser(userId, name))}
          onSetDueAt={(dueAt) => void run(() => setDueAt(dueAt))}
          onStartIdea={() => void startIdea()}
          onUnassign={() => void run(unassign)}
          pending={pending.isPending}
        />
      </Shell.RightColumn>
    </Shell.TwoColumns>
  );
}
