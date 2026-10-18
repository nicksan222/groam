import { Button } from '@groam/ui/components/button';
import { RichTextEditor } from '@groam/ui/components/rich-text-editor';
import { Spinner } from '@groam/ui/components/spinner';
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
            <RichTextEditor
              maxLength={2000}
              aria-label="Leave a comment"
              contentClassName="min-h-24 px-3 py-2.5"
              onChange={onChange}
              placeholder="Leave a comment"
              toolbar
              value={content}
              variant="bare"
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
