import { Button } from '@groam/ui/components/button';
import { RichTextEditor } from '@groam/ui/components/rich-text-editor';
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
            <RichTextEditor
              maxLength={2000}
              aria-label="Issue comment"
              contentClassName="min-h-24 px-3 py-2.5"
              onChange={onChange}
              onSubmit={() => {
                if (!pending && content.trim()) onComment();
              }}
              placeholder="Leave a comment"
              testId={testIds.issueComment}
              toolbar
              value={content}
              variant="bare"
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
