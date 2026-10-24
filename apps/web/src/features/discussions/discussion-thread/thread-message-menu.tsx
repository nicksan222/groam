import { Pencil, Trash2 } from '@groam/icons';
import { ChatMessageMenuItem, ChatMessageMenuSeparator } from '@groam/ui/components/chat';
import { useConfirm } from '@/features/workspace/workspace-shell/use-confirm-dialog';
import { testIds } from '@/lib/test-ids';

/** Edit and delete for the author's own message, in the coss message actions menu. */
export function ThreadMessageMenu({
  onEdit,
  onRemove
}: {
  onEdit?: () => void;
  onRemove?: () => void;
}) {
  const confirm = useConfirm();

  const remove = async () => {
    if (!onRemove) return;
    if (!(await confirm('Delete this message?', 'It will be removed for everyone in this chat.'))) {
      return;
    }
    onRemove();
  };

  return (
    <>
      {onEdit ? (
        <ChatMessageMenuItem data-testid={testIds.chatMessageEdit} onClick={onEdit}>
          <Pencil aria-hidden="true" />
          Edit
        </ChatMessageMenuItem>
      ) : null}
      {onEdit && onRemove ? <ChatMessageMenuSeparator /> : null}
      {onRemove ? (
        <ChatMessageMenuItem
          data-testid={testIds.chatMessageDelete}
          onClick={() => void remove()}
          variant="destructive"
        >
          <Trash2 aria-hidden="true" />
          Delete
        </ChatMessageMenuItem>
      ) : null}
    </>
  );
}
