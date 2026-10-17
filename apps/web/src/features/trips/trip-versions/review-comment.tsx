import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { Badge } from '@groam/ui/components/badge';
import { Button } from '@groam/ui/components/button';
import { Markdown } from '@groam/ui/components/markdown';
import { RichTextEditor } from '@groam/ui/components/rich-text-editor';
import Timeline from '@groam/ui/components/timeline';
import { initials } from '@groam/ui/lib/avatar';
import { Check, MessageSquareReply, ShieldAlert } from 'lucide-react';
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
  const {
    canSubmitReply,
    cancelReply,
    isExpanded,
    isReplying,
    reply,
    setReply,
    showResolved,
    submitReply,
    toggleReplying,
    toggleResolved
  } = useReviewComment({
    onReply,
    onResolve,
    resolvedAt: comment.resolvedAt
  });

  if (comment.resolvedAt && !isExpanded) {
    return (
      <Timeline.Item condensed>
        <Timeline.Badge className="bg-primary/10 text-primary">
          <Check />
        </Timeline.Badge>
        <Timeline.Body className="block">
          <Timeline.Card className="bg-muted/10">
            <Timeline.CardBody className="flex items-center gap-3 py-2">
              <p className="min-w-0 flex-1 text-xs leading-5 text-muted-foreground">
                Conversation started by{' '}
                <strong className="text-foreground">{comment.author.name}</strong> was resolved
              </p>
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
    <Timeline.Item>
      <Timeline.Badge className="bg-muted p-0">
        <Avatar className="size-6">
          <AvatarFallback className="text-[9px] font-semibold">
            {initials(comment.author.name)}
          </AvatarFallback>
        </Avatar>
      </Timeline.Badge>
      <Timeline.Body className="block">
        <Timeline.Card>
          <Timeline.CardHeader>
            <p className="min-w-0 flex-1 text-xs">
              <span className="font-semibold text-foreground">{comment.author.name}</span>
              {'kind' in comment.author && comment.author.kind === 'agent' && (
                <Badge className="ml-1.5 align-middle" variant="secondary">
                  AI reviewer
                </Badge>
              )}
              <span className="font-normal text-muted-foreground">
                {' '}
                commented{' '}
                <time
                  dateTime={new Date(comment.createdAt).toISOString()}
                  title={formatDate(comment.createdAt)}
                >
                  {formatCommentTime(comment.createdAt)}
                </time>
              </span>
            </p>
            {comment.kind === 'change_request' && !comment.resolvedAt ? (
              <Badge variant="destructive">
                <ShieldAlert /> Changes requested
              </Badge>
            ) : null}
            {comment.resolvedAt && <Badge variant="secondary">Resolved</Badge>}
          </Timeline.CardHeader>
          <Timeline.CardBody>
            <Markdown className="text-sm leading-6">{comment.content}</Markdown>
            {replies.length > 0 && (
              <div className="mt-4 space-y-4 border-l-2 border-muted pl-3">
                {replies.map((item) => (
                  <div key={item.id}>
                    <p className="text-xs font-semibold">
                      {item.author.name}{' '}
                      <span className="font-normal text-muted-foreground">
                        commented{' '}
                        <time
                          dateTime={new Date(item.createdAt).toISOString()}
                          title={formatDate(item.createdAt)}
                        >
                          {formatCommentTime(item.createdAt)}
                        </time>
                      </span>
                    </p>
                    <Markdown className="mt-1 text-sm leading-6">{item.content}</Markdown>
                  </div>
                ))}
              </div>
            )}
          </Timeline.CardBody>
          <Timeline.CardActions>
            {!comment.resolvedAt && (
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
          {isReplying && (
            <div className="px-3 pb-3">
              <RichTextEditor
                maxLength={2000}
                aria-label={`Reply to ${comment.author.name}`}
                contentClassName="min-h-16"
                onChange={setReply}
                onSubmit={() => void submitReply()}
                placeholder="Write a reply…"
                toolbar
                value={reply}
              />
              <div className="mt-2 flex justify-end gap-2">
                <Button onClick={cancelReply} size="xs" variant="ghost">
                  Cancel
                </Button>
                <Button
                  disabled={disabled || !canSubmitReply}
                  onClick={() => void submitReply()}
                  size="xs"
                >
                  Reply
                </Button>
              </div>
            </div>
          )}
        </Timeline.Card>
      </Timeline.Body>
    </Timeline.Item>
  );
}
