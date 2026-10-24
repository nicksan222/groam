import { Bot, Link2, MessageSquare, Sparkles } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import type { useResearchRun } from '@/features/research/hooks/use-research-run';
import type { DiscussionMessage } from '@/types/discussions';
import type { ResearchDetail, ResearchLink, ResearchTimelineEntry } from '@/types/research';
import { ResearchBrief } from './research-brief';
import { ResearchNote } from './research-note';
import { ResearchTimelineItem } from './research-timeline-item';
import { ResearchTimelineRun } from './research-timeline-run';

const kindLabels: Record<ResearchLink['target']['kind'], string> = {
  activity: 'activity',
  destination: 'destination',
  idea: 'idea',
  issue: 'issue',
  stay: 'stay'
};
const stamp = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** The brief, then every link, run, and note in the order they happened. */
export function ResearchTimeline({
  activity,
  caveat,
  notes,
  notesStatus,
  onLoadMore,
  onOpen,
  onSaveBrief,
  research,
  sourceCount,
  writable
}: {
  activity: ReturnType<typeof useResearchRun>;
  caveat: null | string;
  notes: DiscussionMessage[];
  notesStatus: string;
  onLoadMore: () => void;
  onOpen: (link: ResearchLink) => void;
  onSaveBrief: (brief: string) => Promise<boolean>;
  research: ResearchDetail;
  sourceCount: number;
  writable: boolean;
}) {
  const { run } = activity;
  const entries: ResearchTimelineEntry[] = [
    ...research.links.map((link) => ({
      at: link.createdAt,
      key: link.id,
      kind: 'link' as const,
      link
    })),
    ...(run ? [{ at: run.completedAt ?? run.updatedAt, key: run.id, kind: 'run' as const }] : []),
    ...notes.map((message) => ({
      at: message._creationTime,
      key: message.key,
      kind: 'note' as const,
      message
    }))
  ].sort((a, b) => a.at - b.at);
  return (
    <ol
      aria-label="Research history"
      className="relative before:absolute before:top-2 before:bottom-2 before:left-3 before:w-px before:bg-border"
    >
      <ResearchTimelineItem icon={<Sparkles />}>
        <ResearchBrief
          brief={research.brief}
          canEdit={research.canManage && writable}
          onSave={onSaveBrief}
        />
      </ResearchTimelineItem>
      {notesStatus === 'CanLoadMore' || notesStatus === 'LoadingMore' ? (
        <ResearchTimelineItem icon={<MessageSquare />}>
          <Button
            className="-mt-1"
            onClick={onLoadMore}
            pending={notesStatus === 'LoadingMore'}
            size="sm"
            variant="ghost"
          >
            Show earlier notes
          </Button>
        </ResearchTimelineItem>
      ) : null}
      {entries.map((entry) =>
        entry.kind === 'link' ? (
          <ResearchTimelineItem icon={<Link2 />} key={entry.key}>
            <p className="text-xs leading-6 text-muted-foreground">
              <span className="font-medium text-foreground">{entry.link.createdByName}</span> linked{' '}
              {kindLabels[entry.link.target.kind]}{' '}
              {entry.link.target.kind === 'issue' || entry.link.target.kind === 'idea' ? (
                <Button
                  className="h-auto p-0 align-baseline text-xs font-medium"
                  onClick={() => onOpen(entry.link)}
                  variant="link"
                >
                  {entry.link.label}
                </Button>
              ) : (
                <span className="font-medium text-foreground">{entry.link.label}</span>
              )}
              <time className="ml-2 tabular-nums" dateTime={new Date(entry.at).toISOString()}>
                {stamp.format(entry.at)}
              </time>
            </p>
          </ResearchTimelineItem>
        ) : entry.kind === 'run' && run ? (
          <ResearchTimelineItem icon={<Bot />} key={entry.key}>
            <ResearchTimelineRun
              activity={activity}
              caveat={caveat}
              run={run}
              sourceCount={sourceCount}
              writable={writable}
            />
          </ResearchTimelineItem>
        ) : entry.kind === 'note' ? (
          <ResearchTimelineItem icon={<MessageSquare />} key={entry.key}>
            <div className="[&>article]:py-0">
              <ResearchNote message={entry.message} />
            </div>
          </ResearchTimelineItem>
        ) : null
      )}
    </ol>
  );
}
