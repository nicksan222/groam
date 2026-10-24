import { MAX_PROPOSAL_FEEDBACK_LENGTH } from '@groam/backend/convex/modules/travel/versions/lengths';
import { CommentComposer } from '@groam/ui/components/comment-composer';
import Timeline from '@groam/ui/components/timeline';
import { ComposerTimelineBadge } from '@/features/workspace/workspace-shell/composer-timeline-badge';

/** Resolve `false` to keep the typed text. */
export function ConversationComposer({
  disabled,
  onSubmit
}: {
  disabled: boolean;
  onSubmit: (kind: 'change_request' | 'comment', content: string) => Promise<boolean>;
}) {
  return (
    <Timeline.Item>
      <ComposerTimelineBadge />
      <Timeline.Body className="block">
        <CommentComposer
          alternative={{
            label: 'Comment',
            onSubmit: (content) => onSubmit('comment', content),
            // Mod+Enter leaves a comment; asking for changes blocks approval, so it takes a click.
            shortcut: true
          }}
          disabled={disabled}
          label="Leave a comment"
          maxLength={MAX_PROPOSAL_FEEDBACK_LENGTH}
          onSubmit={(content) => onSubmit('change_request', content)}
          placeholder="Leave a comment…"
          submitLabel="Request changes"
        />
      </Timeline.Body>
    </Timeline.Item>
  );
}
