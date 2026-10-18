import type { Id } from '@groam/backend/data-model';
import { Badge } from '@groam/ui/components/badge';
import Timeline from '@groam/ui/components/timeline';
import { useState } from 'react';
import { conversationPurpose, conversationTitle } from '@/features/ideas/idea-list/idea-page-copy';
import type { useTripVersion } from '@/features/trips/hooks/use-trip-versions';
import { ConversationComposer } from './conversation-composer';
import { ConversationEmpty } from './conversation-empty';
import { IdeaSectionHeading } from './idea-section-heading';
import { ProposalStatusEvent } from './proposal-status-event';
import type { VersionStatus } from './proposal-types';
import { ReviewComment } from './review-comment';

export function ProposalFeedback({
  addFeedback,
  authorName,
  feedback,
  pendingAction,
  resolveFeedback,
  run,
  status
}: {
  addFeedback: (
    content: string,
    parentCommentId?: Id<'tripProposalComments'>,
    changeKey?: string,
    kind?: 'change_request' | 'comment'
  ) => Promise<boolean>;
  authorName: string;
  feedback: ReturnType<typeof useTripVersion>['feedback'];
  pendingAction: string | null;
  resolveFeedback: (commentId: Id<'tripProposalComments'>, resolved: boolean) => Promise<boolean>;
  run: (label: string, action: () => Promise<boolean>) => Promise<boolean>;
  status: VersionStatus;
}) {
  const [content, setContent] = useState('');
  const conversations =
    feedback?.filter((comment) => comment.parentCommentId === null && !comment.changeKey) ?? [];
  const acceptingComments = status !== 'closed' && status !== 'merged';
  const submit = async (kind: 'change_request' | 'comment') => {
    const value = content.trim();
    if (!value) return;
    if (await run('feedback', () => addFeedback(value, undefined, undefined, kind))) setContent('');
  };
  return (
    <section
      aria-labelledby="proposal-conversation-heading"
      className="overflow-hidden border-t border-border pt-5"
      id="conversation"
    >
      <IdeaSectionHeading
        badge={<Badge variant="secondary">{conversations.length}</Badge>}
        className="px-1 py-3"
        description={conversationPurpose(status, acceptingComments)}
        title={conversationTitle}
        titleId="proposal-conversation-heading"
      />
      <Timeline className="mt-1" clipSidebar variant="activity">
        {conversations.map((comment) => (
          <ReviewComment
            comment={comment}
            disabled={pendingAction !== null || !acceptingComments}
            key={comment.id}
            onReply={(reply) => addFeedback(reply, comment.id)}
            onResolve={() =>
              run(`feedback:${comment.id}`, () => resolveFeedback(comment.id, !comment.resolvedAt))
            }
            replies={feedback?.filter((reply) => reply.parentCommentId === comment.id) ?? []}
          />
        ))}
        {conversations.length === 0 && (
          <ConversationEmpty acceptingComments={acceptingComments} status={status} />
        )}
        {(status === 'closed' || status === 'merged') && (
          <ProposalStatusEvent authorName={authorName} status={status} />
        )}
        {acceptingComments && (
          <ConversationComposer
            content={content}
            disabled={pendingAction !== null}
            onChange={setContent}
            onSubmit={(kind) => void submit(kind)}
            pending={pendingAction === 'feedback'}
          />
        )}
      </Timeline>
    </section>
  );
}
