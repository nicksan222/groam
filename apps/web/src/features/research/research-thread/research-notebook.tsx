import type { Id } from '@groam/backend/data-model';
import { Plus } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { useState } from 'react';
import { useDiscussionThread } from '@/features/discussions/hooks/use-discussion-thread';
import { useSaveResearchNote } from '@/features/research/hooks/use-save-research-note';
import { ResearchNoteForm } from './research-note-form';
import { ResearchNotebookEntries } from './research-notebook-entries';

export function ResearchNotebook({
  discussionId,
  threadId,
  writable
}: {
  discussionId: Id<'discussions'>;
  threadId: string | null;
  writable: boolean;
}) {
  const thread = useDiscussionThread(discussionId, threadId);
  const saveNote = useSaveResearchNote(discussionId);
  const [composing, setComposing] = useState(false);
  const notes = thread.messages
    .filter((message) => ['user', 'assistant'].includes(message.role))
    .toReversed();
  return (
    <section aria-label="Research notebook" className="min-w-0">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Notes &amp; findings</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            The latest contributions, kept together for the group.
          </p>
        </div>
        {writable ? (
          <Button
            className="shrink-0"
            onClick={() => setComposing(!composing)}
            size="sm"
            variant="outline"
          >
            <Plus aria-hidden />
            {composing ? 'Close editor' : 'Add note'}
          </Button>
        ) : null}
      </div>
      {writable ? (
        <div
          hidden={!composing}
          className="mb-6 overflow-hidden rounded-lg border border-border/60 [&>div]:border-0"
        >
          <ResearchNoteForm disabled={!threadId} onSave={saveNote} />
        </div>
      ) : null}
      <ResearchNotebookEntries
        messages={notes}
        status={thread.status}
        loadMore={thread.loadMore}
        onCreate={writable ? () => setComposing(true) : undefined}
      />
      {!writable ? (
        <p className="mt-4 text-xs text-muted-foreground" role="status">
          This trip is archived
        </p>
      ) : null}
    </section>
  );
}
