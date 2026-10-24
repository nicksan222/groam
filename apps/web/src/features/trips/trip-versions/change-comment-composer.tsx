import { MAX_PROPOSAL_FEEDBACK_LENGTH } from '@groam/backend/convex/modules/travel/versions/lengths';
import { CommentComposer } from '@groam/ui/components/comment-composer';

export function ChangeCommentComposer({
  label,
  onCancel,
  onComment
}: {
  label: string;
  onCancel: () => void;
  onComment: (content: string) => Promise<boolean>;
}) {
  return (
    <CommentComposer
      hint="Comments don’t block approval."
      label={`Comment on ${label}`}
      maxLength={MAX_PROPOSAL_FEEDBACK_LENGTH}
      onCancel={onCancel}
      onSubmit={async (content) => {
        const saved = await onComment(content);
        if (saved) onCancel();
        return saved;
      }}
      placeholder="Ask a question or share a thought…"
      showLabel
      submitLabel="Comment"
      surface="plain"
    />
  );
}
