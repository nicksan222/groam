import type { Id } from '@groam/backend/data-model';
import { usePollActions } from '@/features/polls/hooks/use-polls';
import { usePollDialogStore } from '@/lib/stores/poll-dialog-store';
import { CreatePollDialog } from './create-poll-dialog';

/** The "/poll" dialog of one chat. Its open state lives in a store, apart from the thread. */
export function ChatPollDialog({ discussionId }: { discussionId: Id<'discussions'> }) {
  const open = usePollDialogStore((state) => state.discussionId === discussionId);
  const close = usePollDialogStore((state) => state.close);
  const { create } = usePollActions();
  return (
    <CreatePollDialog
      onClose={close}
      onCreate={(draft) => create({ ...draft, discussionId })}
      open={open}
    />
  );
}
