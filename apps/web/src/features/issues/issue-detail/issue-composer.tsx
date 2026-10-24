import { MAX_ISSUE_COMMENT_LENGTH } from '@groam/backend/convex/modules/travel/issues/lengths';
import { CommentComposer } from '@groam/ui/components/comment-composer';
import Timeline from '@groam/ui/components/timeline';
import { ComposerTimelineBadge } from '@/features/workspace/workspace-shell/composer-timeline-badge';
import { testIds } from '@/lib/test-ids';

/** Resolve `false` to keep the typed comment. */
export function IssueComposer({ onComment }: { onComment: (content: string) => Promise<boolean> }) {
  return (
    <Timeline.Item>
      <ComposerTimelineBadge />
      <Timeline.Body className="block">
        <CommentComposer
          label="Issue comment"
          maxLength={MAX_ISSUE_COMMENT_LENGTH}
          onSubmit={onComment}
          placeholder="Leave a comment…"
          submitLabel="Comment"
          submitTestId={testIds.issueCommentSubmit}
          testId={testIds.issueComment}
        />
      </Timeline.Body>
    </Timeline.Item>
  );
}
