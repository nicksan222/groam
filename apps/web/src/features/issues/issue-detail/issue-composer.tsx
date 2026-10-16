import { Button } from '@groam/ui/components/button';
import { Textarea } from '@groam/ui/components/textarea';
import Timeline from '@groam/ui/components/timeline';
import { ComposerTimelineBadge } from '@/features/workspace/workspace-shell/composer-timeline-badge';
import { testIds } from '@/lib/test-ids';

export function IssueComposer({
  content,
  onChange,
  onComment,
  pending
}: {
  content: string;
  onChange: (value: string) => void;
  onComment: () => void;
  pending: boolean;
}) {
  return (
    <Timeline.Item>
      <ComposerTimelineBadge />
      <Timeline.Body className="block">
        <Timeline.Card>
          <Timeline.CardBody className="p-0">
            <Textarea
              aria-label="Issue comment"
              className="min-h-24 rounded-none border-0 bg-transparent shadow-none focus-visible:border-0 focus-visible:ring-0"
              data-testid={testIds.issueComment}
              maxLength={2000}
              onChange={(event) => onChange(event.target.value)}
              placeholder="Leave a comment"
              value={content}
            />
          </Timeline.CardBody>
          <Timeline.CardActions className="justify-end border-t bg-muted/25 py-2">
            <Button
              data-testid={testIds.issueCommentSubmit}
              disabled={pending || !content.trim()}
              onClick={onComment}
              size="sm"
            >
              Comment
            </Button>
          </Timeline.CardActions>
        </Timeline.Card>
      </Timeline.Body>
    </Timeline.Item>
  );
}
