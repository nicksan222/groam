import Timeline from '@groam/ui/components/timeline';
import { UserRound } from 'lucide-react';
import { relativeIssueDate } from '@/features/issues/hooks/issue-relative-date';

export function IssueSystemEvent({
  events
}: {
  events: ReadonlyArray<{
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
            <li className="text-xs leading-5 text-muted-foreground" key={event.id}>
              <span className="text-foreground/70">{event.message}</span>
              <span>
                {' '}
                <time dateTime={new Date(event.timestamp).toISOString()}>
                  {relativeIssueDate(event.timestamp)}
                </time>
              </span>
            </li>
          ))}
        </ul>
      </Timeline.Body>
    </Timeline.Item>
  );
}
