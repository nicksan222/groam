import { Button } from '@groam/ui/components/button';
import { Spinner } from '@groam/ui/components/spinner';
import { Textarea } from '@groam/ui/components/textarea';
import Timeline from '@groam/ui/components/timeline';
import { ComposerTimelineBadge } from '@/features/workspace/workspace-shell/composer-timeline-badge';

export function ConversationComposer({
  content,
  disabled,
  onChange,
  onSubmit,
  pending
}: {
  content: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: (kind: 'change_request' | 'comment') => void;
  pending: boolean;
}) {
  return (
    <Timeline.Item>
      <ComposerTimelineBadge />
      <Timeline.Body className="block">
        <Timeline.Card>
          <Timeline.CardBody className="p-0">
            <label className="sr-only" htmlFor="proposal-conversation-comment">
              Leave a comment
            </label>
            <Textarea
              className="min-h-24 rounded-none border-0 bg-transparent shadow-none focus-visible:border-0 focus-visible:ring-0"
              id="proposal-conversation-comment"
              maxLength={2000}
              onChange={(event) => onChange(event.target.value)}
              placeholder="Leave a comment"
              value={content}
            />
          </Timeline.CardBody>
          <Timeline.CardActions className="border-t bg-muted/25 py-2">
            <Button
              disabled={disabled || content.trim().length === 0}
              onClick={() => onSubmit('comment')}
              size="sm"
              variant="outline"
            >
              {pending && <Spinner />}
              Comment
            </Button>
            <Button
              disabled={disabled || content.trim().length === 0}
              onClick={() => onSubmit('change_request')}
              size="sm"
            >
              {pending && <Spinner />}
              Request changes
            </Button>
          </Timeline.CardActions>
        </Timeline.Card>
      </Timeline.Body>
    </Timeline.Item>
  );
}
