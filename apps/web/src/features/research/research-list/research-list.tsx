import { Button } from '@groam/ui/components/button';
import { DashedEmpty } from '@groam/ui/components/dashed-empty';
import { Skeleton } from '@groam/ui/components/skeleton';
import { Link2, Plus, Search, Users } from 'lucide-react';
import { testIds } from '@/lib/test-ids';
import type { ResearchSummary } from '@/types/research';

export function ResearchList({
  isLoading = false,
  onCreate,
  onOpen,
  researches
}: {
  isLoading?: boolean;
  onCreate: () => void;
  onOpen: (research: ResearchSummary) => void;
  researches: ResearchSummary[];
}) {
  if (isLoading) {
    return (
      <div aria-label="Loading researches…" className="grid gap-3" role="status">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <section className="grid gap-4" data-testid={testIds.researchList}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Research</h2>
        <Button data-testid={testIds.researchCreate} onClick={onCreate} size="sm">
          <Plus aria-hidden /> New research
        </Button>
      </div>
      {researches.length === 0 ? (
        <DashedEmpty
          action={
            <Button className="mt-4" onClick={onCreate} variant="outline">
              Start a research
            </Button>
          }
          className="py-12"
          icon={Search}
          title="No research yet"
        >
          Start a research: dump links and notes about one subject
        </DashedEmpty>
      ) : (
        <ul className="grid gap-3">
          {researches.map((research) => (
            <li key={research.id}>
              <ResearchCard onOpen={onOpen} research={research} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ResearchCard({
  onOpen,
  research
}: {
  onOpen: (research: ResearchSummary) => void;
  research: ResearchSummary;
}) {
  return (
    <Button
      variant="ghost"
      className="grid h-auto w-full justify-items-start gap-1.5 whitespace-normal rounded-xl font-normal border border-border bg-card p-4 text-left text-card-foreground transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      data-testid={testIds.researchCard}
      onClick={() => onOpen(research)}
      type="button"
    >
      <span className="flex items-center gap-2">
        {research.unread ? (
          <span
            aria-label="Unread messages"
            className="size-2 shrink-0 rounded-full bg-primary"
            data-testid={testIds.researchUnread}
            role="img"
          />
        ) : null}
        <span className="truncate font-medium">{research.title}</span>
      </span>
      {research.brief ? (
        <span className="line-clamp-2 text-sm text-muted-foreground">{research.brief}</span>
      ) : null}
      {research.lastMessage ? (
        <span className="truncate text-sm">
          <span className="font-medium">{research.lastMessage.authorName}: </span>
          <span>{research.lastMessage.text}</span>
        </span>
      ) : null}
      <span className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1" title="Participants">
          <Users aria-hidden className="size-3.5" />
          {research.participantCount} {research.participantCount === 1 ? 'person' : 'people'}
        </span>
        <span className="inline-flex items-center gap-1" title="Links">
          <Link2 aria-hidden className="size-3.5" />
          {research.linkCount} {research.linkCount === 1 ? 'link' : 'links'}
        </span>
      </span>
    </Button>
  );
}
