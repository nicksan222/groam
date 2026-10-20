import { UserRound } from '@groam/icons';
import Timeline from '@groam/ui/components/timeline';
import { relativeIssueDate } from '@/features/issues/hooks/issue-relative-date';
import type { IssueEvent } from '@/types/issues';
import { IssueEventLine } from './issue-event-line';

/** Consecutive changes people made, sharing one quiet rail marker. */
export function IssueSystemEvent({
  events
}: {
  events: ReadonlyArray<{
    actorName: string;
    event: Exclude<IssueEvent, { kind: 'auto' }> | null;
    id: string;
    message: string;
    timestamp: number;
  }>;
}) {
  return (
    <Timeline.Item condensed>
      <Timeline.Badge aria-hidden className="border-border/50 bg-muted/40 text-muted-foreground">
        <UserRound />
      </Timeline.Badge>
      <Timeline.Body className="block">
        <ul className="space-y-1">
          {events.map((event) => (
            <li className="text-xs leading-6 text-muted-foreground" key={event.id}>
              <IssueEventLine
                actorName={event.actorName}
                event={event.event}
                message={event.message}
              />{' '}
              <time dateTime={new Date(event.timestamp).toISOString()}>
                {relativeIssueDate(event.timestamp)}
              </time>
            </li>
          ))}
        </ul>
      </Timeline.Body>
    </Timeline.Item>
  );
}
