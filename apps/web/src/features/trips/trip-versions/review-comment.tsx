import { MAX_PROPOSAL_FEEDBACK_LENGTH } from '@groam/backend/convex/modules/travel/versions/lengths';
import { Check, Clock3, MessageSquareReply, ShieldAlert } from '@groam/icons';
import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { Badge } from '@groam/ui/components/badge';
import { Button } from '@groam/ui/components/button';
import { CommentComposer } from '@groam/ui/components/comment-composer';
import { Markdown } from '@groam/ui/components/markdown';
import { MutedCopy } from '@groam/ui/components/muted-copy';
import Timeline from '@groam/ui/components/timeline';
import { initials } from '@groam/ui/lib/avatar';
import { useReviewComment } from '@/features/trips/hooks/use-review-comment';
import { formatCommentTime, formatDate } from '@/features/trips/hooks/version-format';
import type { ProposalFeedbackItem } from './proposal-types';

export function ReviewComment({
  comment,
  disabled,
  onReply,
  onResolve,
  replies
}: {
  comment: ProposalFeedbackItem;
  disabled: boolean;
  onReply: (content: string) => Promise<boolean>;
  onResolve: () => Promise<boolean>;
  replies: ProposalFeedbackItem[];
}) {
  const { cancelReply, isExpanded, isReplying, showResolved, toggleReplying, toggleResolved } =
    useReviewComment({ onResolve, resolvedAt: comment.resolvedAt });

  if (comment.resolvedAt && !isExpanded) {
    return (
      <Timeline.Item condensed>
        <Timeline.Badge className="bg-primary/10 text-primary">
          <Check />
        </Timeline.Badge>
        <Timeline.Body className="block">
          <Timeline.Card className="bg-muted/10">
            <Timeline.CardBody className="flex items-center gap-3 py-2">
              <MutedCopy size="xs" className="min-w-0 flex-1">
                Conversation started by{' '}
                <strong className="text-foreground">{comment.author.name}</strong> was resolved
              </MutedCopy>
              <Button onClick={showResolved} size="xs" variant="ghost">
                Show conversation
              </Button>
            </Timeline.CardBody>
          </Timeline.Card>
        </Timeline.Body>
      </Timeline.Item>
    );
  }
  return (
    <Timeline.Item className="block before:hidden after:hidden">
      <Timeline.Body className="block">
        <Timeline.Card>
          <div className="divide-y divide-border">
            {[comment, ...replies].map((item) => (
              <section aria-label={`Comment by ${item.author.name}`} key={item.id}>
                <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/25 px-4 py-3">
                  <Avatar className="size-6 shrink-0">
                    <AvatarFallback className="text-[9px] font-semibold">
                      {initials(item.author.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-semibold">{item.author.name}</span>
                  <Badge
                    className="rounded-full font-normal text-muted-foreground"
                    variant="secondary"
                  >
                    <Clock3 aria-hidden="true" />
                    <time
                      dateTime={new Date(item.createdAt).toISOString()}
                      title={formatDate(item.createdAt)}
                    >
                      {formatCommentTime(item.createdAt)}
                    </time>
                  </Badge>
                  {'kind' in item.author && item.author.kind === 'agent' && (
                    <Badge variant="secondary">AI reviewer</Badge>
                  )}
                  {item.id === comment.id &&
                    comment.kind === 'change_request' &&
                    !comment.resolvedAt && (
                      <Badge variant="destructive">
                        <ShieldAlert /> Changes requested
                      </Badge>
                    )}
                  {item.id === comment.id && comment.resolvedAt && (
                    <Badge variant="secondary">Resolved</Badge>
                  )}
                </div>
                <div className="px-4 py-4">
                  <Markdown className="text-sm leading-6">{item.content}</Markdown>
                </div>
              </section>
            ))}
          </div>
          {(!isReplying || comment.kind === 'change_request') && (
            <Timeline.CardActions className="justify-start border-t border-border bg-muted/25 px-4 py-2">
              {!comment.resolvedAt && !isReplying && (
                <Button disabled={disabled} onClick={toggleReplying} size="xs" variant="ghost">
                  <MessageSquareReply /> Reply
                </Button>
              )}
              {comment.kind === 'change_request' ? (
                <Button
                  disabled={disabled}
                  onClick={() => void toggleResolved()}
                  size="xs"
                  variant="outline"
                >
                  <Check /> {comment.resolvedAt ? 'Reopen' : 'Resolve request'}
                </Button>
              ) : null}
            </Timeline.CardActions>
          )}
          {isReplying && (
            <div className="border-t border-border bg-muted/25 p-3">
              <CommentComposer
                autoFocus
                disabled={disabled}
                label={`Reply to ${comment.author.name}`}
                maxLength={MAX_PROPOSAL_FEEDBACK_LENGTH}
                onCancel={cancelReply}
                onSubmit={async (content) => {
                  const sent = await onReply(content);
                  if (sent) cancelReply();
                  return sent;
                }}
                placeholder="Write a reply…"
                submitLabel="Reply"
                surface="plain"
              />
            </div>
          )}
        </Timeline.Card>
      </Timeline.Body>
    </Timeline.Item>
  );
}
