import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { Markdown } from '@groam/ui/components/markdown';
import Timeline from '@groam/ui/components/timeline';
import { initials } from '@groam/ui/lib/avatar';
import { relativeDate } from '@/lib/relative-date';

export function IssueComment({
  authorName,
  body,
  opening = false,
  timestamp
}: {
  authorName: string;
  body: string;
  /** The issue's own description: it "opened this issue" rather than commented, with no Author chip. */
  opening?: boolean;
  timestamp: number;
}) {
  return (
    <Timeline.Item>
      <Timeline.Badge className="bg-muted p-0">
        <Avatar className="size-6">
          <AvatarFallback className="text-[9px] font-semibold">
            {initials(authorName)}
          </AvatarFallback>
        </Avatar>
      </Timeline.Badge>
      <Timeline.Body className="block">
        <Timeline.Card>
          <Timeline.CardHeader className="min-h-8 gap-x-2 px-3 py-2">
            <p className="min-w-0 flex-1 text-xs leading-5">
              <span className="font-semibold text-foreground">{authorName}</span>
              <span className="font-normal text-muted-foreground">
                {' '}
                {opening ? 'opened this issue' : 'commented'}{' '}
                <time dateTime={new Date(timestamp).toISOString()}>{relativeDate(timestamp)}</time>
              </span>
            </p>
          </Timeline.CardHeader>
          <Timeline.CardBody className="px-3 py-3">
            {body.trim() ? (
              <Markdown className="text-sm leading-relaxed">{body}</Markdown>
            ) : (
              <p className="text-sm leading-relaxed">No description provided.</p>
            )}
          </Timeline.CardBody>
        </Timeline.Card>
      </Timeline.Body>
    </Timeline.Item>
  );
}
