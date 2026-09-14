import { FormDialog } from '@groam/ui/components/form-dialog';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { type FormEvent, useState } from 'react';
import {
  type DiscussionListItem,
  useRenameDiscussion
} from '@/features/discussions/hooks/use-discussions';
import { useAsyncPending } from '@/features/workspace/hooks/use-async-pending';
import { testIds } from '@/lib/test-ids';

const TITLE_MAX_LENGTH = 80;

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
  const [error, setError] = useState<string | null>(null);
  const submitting = useAsyncPending();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Give this chat a name.');
      return;
    }

    setError(null);
    await submitting.run(async () => {
      const renamed = await renameDiscussion(discussion.id, trimmedTitle);
      if (renamed) onClose();
      else setError('Unable to rename this chat');
    });
  };

  return (
    <FormDialog
      description="The name everyone sees in the inbox."
      error={error}
      isPending={submitting.isPending}
      onClose={onClose}
      onSubmit={(event) => void submit(event)}
      open={open}
      submitLabel="Save name"
      testId={testIds.chatRenameDialog}
      title="Rename chat"
    >
      <FormField label="Name" required>
        <Input
          autoFocus
          data-testid={testIds.chatRenameTitle}
          disabled={submitting.isPending}
          maxLength={TITLE_MAX_LENGTH}
          onChange={(event) => setTitle(event.target.value)}
          value={title}
        />
      </FormField>
    </FormDialog>
  );
}
