import type { Id } from '@groam/backend/data-model';
import { Button } from '@groam/ui/components/button';
import { ArrowUpRight } from 'lucide-react';
import { useDiscussionThread } from '@/features/discussions/hooks/use-discussion-thread';
import { useLatestResearchRun } from '@/features/research/hooks/use-latest-research-run';
import { useSaveResearchNote } from '@/features/research/hooks/use-save-research-note';
import { ResearchSourceForm } from './research-source-form';
import { researchSources } from './research-sources-utils';

export function ResearchSources({
  discussionId,
  threadId,
  writable
}: {
  discussionId: Id<'discussions'>;
  threadId: null | string;
  writable: boolean;
}) {
  const thread = useDiscussionThread(discussionId, threadId);
  const run = useLatestResearchRun(discussionId);
  const saveNote = useSaveResearchNote(discussionId);
  const sources = researchSources([...thread.messages, { text: run?.report ?? '' }]);
  return (
    <section aria-labelledby="research-sources-heading" className="min-w-0 space-y-4">
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold" id="research-sources-heading">
          Sources
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Sources cited in the latest report and loaded notes.
        </p>
      </div>
      {writable ? (
        <ResearchSourceForm
          disabled={!threadId || thread.isSending || thread.isResponding}
          onAdd={saveNote}
        />
      ) : null}
      {sources.length ? (
        <ul className="divide-y divide-border/50 border-y border-border/50">
          {sources.map((source) => (
            <li key={source.href}>
              <a
                className="group flex items-start justify-between gap-4 py-4 transition-colors hover:text-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                href={source.href}
                rel="noopener noreferrer"
                target="_blank"
              >
                <span className="min-w-0 space-y-1">
                  <span className="block text-sm font-medium break-words">{source.host}</span>
                  {source.path ? (
                    <span className="block text-xs leading-relaxed break-all text-muted-foreground">
                      {source.path}
                    </span>
                  ) : null}
                </span>
                <ArrowUpRight
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground group-hover:text-primary"
                />
                <span className="sr-only">Open source in a new tab</span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-4 text-sm leading-relaxed text-muted-foreground" role="status">
          {threadId && thread.status === 'LoadingFirstPage'
            ? 'Looking for source links…'
            : 'No sources yet. Research reports and links shared in notes will appear here.'}
        </p>
      )}
      {thread.status === 'CanLoadMore' || thread.status === 'LoadingMore' ? (
        <Button
          disabled={thread.status === 'LoadingMore'}
          onClick={() => thread.loadMore(30)}
          size="sm"
          variant="ghost"
        >
          {thread.status === 'LoadingMore'
            ? 'Looking through notes…'
            : 'Look through earlier notes'}
        </Button>
      ) : null}
    </section>
  );
}
