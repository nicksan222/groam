import { MAX_DISCUSSION_TITLE_LENGTH } from '@groam/backend/convex/modules/discussions/threads/lengths';
import { FormDialog } from '@groam/ui/components/form-dialog';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
import { useState } from 'react';
import {
  type DiscussionListItem,
  useRenameDiscussion
} from '@/features/discussions/hooks/use-discussions';
import { testIds } from '@/lib/test-ids';

export function DiscussionRenameDialog({
  discussion,
  onClose,
  open
}: {
  discussion: DiscussionListItem;
  onClose: () => void;
  open: boolean;
}) {
  return (
    <DiscussionRenameForm
      discussion={discussion}
      key={open ? `${discussion.id}:${discussion.title}` : 'closed'}
      onClose={onClose}
      open={open}
    />
  );
}

function DiscussionRenameForm({
  discussion,
  onClose,
  open
}: {
  discussion: DiscussionListItem;
  onClose: () => void;
  open: boolean;
}) {
  const { renameDiscussion } = useRenameDiscussion();
  const [title, setTitle] = useState(discussion.title);
  const form = useFormSubmit({ fallbackError: 'Unable to rename this chat' });

  const submit = form.handle(async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    if (await renameDiscussion(discussion.id, trimmedTitle)) onClose();
    else form.setError('Unable to rename this chat');
  });

  return (
    <FormDialog
      description="The name everyone sees in the inbox."
      error={form.error}
      isPending={form.isPending}
      onClose={onClose}
      onSubmit={submit}
      open={open}
      submitDisabled={!title.trim()}
      submitLabel="Save changes"
      testId={testIds.chatRenameDialog}
      title="Rename chat"
    >
      <FormField label="Name" required>
        <Input
          autoFocus
          data-testid={testIds.chatRenameTitle}
          disabled={form.isPending}
          maxLength={MAX_DISCUSSION_TITLE_LENGTH}
          onChange={(event) => setTitle(event.target.value)}
          value={title}
        />
      </FormField>
    </FormDialog>
  );
}
