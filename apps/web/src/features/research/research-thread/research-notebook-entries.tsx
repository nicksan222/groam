import { Button } from '@groam/ui/components/button';
import Shell from '@groam/ui/components/shell/client';
import type { DiscussionMessage } from '@/types/discussions';
import { ResearchNote } from './research-note';
import { ResearchNotebookEmpty } from './research-notebook-empty';

export function ResearchNotebookEntries({
  messages,
  status,
  loadMore,
  onCreate
}: {
  messages: DiscussionMessage[];
  status: string;
  loadMore: (count: number) => void;
  onCreate?: () => void;
}) {
  return (
    <Shell.Card padding="md">
      {status === 'LoadingFirstPage' ? (
        <p className="py-8 text-sm text-muted-foreground" role="status">
          Loading research notes…
        </p>
      ) : messages.length ? (
        <div className="divide-y divide-border/50">
          {messages.map((message) => (
            <ResearchNote key={message.key} message={message} />
          ))}
        </div>
      ) : (
        <ResearchNotebookEmpty onCreate={onCreate} />
      )}
      {status === 'CanLoadMore' || status === 'LoadingMore' ? (
        <Button
          className="mt-4 w-full"
          disabled={status === 'LoadingMore'}
          onClick={() => loadMore(30)}
          variant="ghost"
        >
          {status === 'LoadingMore' ? 'Loading…' : 'Load earlier notes'}
        </Button>
      ) : null}
    </Shell.Card>
  );
}
