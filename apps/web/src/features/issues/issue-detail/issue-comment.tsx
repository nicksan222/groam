import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { Badge } from '@groam/ui/components/badge';
import Timeline from '@groam/ui/components/timeline';
import { initials } from '@groam/ui/lib/avatar';
import { relativeIssueDate } from '@/features/issues/hooks/issue-relative-date';

export function IssueComment({
  authorName,
  body,
  isAuthor = false,
  timestamp
}: {
  authorName: string;
  body: string;
  isAuthor?: boolean;
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
          <Timeline.CardHeader className="min-h-8 gap-x-1.5 px-3 py-1.5">
            <p className="min-w-0 flex-1 text-xs leading-5">
              <span className="font-semibold text-foreground">{authorName}</span>
              {isAuthor && (
                <Badge className="ml-1.5 align-middle" variant="secondary">
                  Author
                </Badge>
              )}
              <span className="font-normal text-muted-foreground">
                {' '}
                commented{' '}
                <time dateTime={new Date(timestamp).toISOString()}>
                  {relativeIssueDate(timestamp)}
                </time>
              </span>
            </p>
          </Timeline.CardHeader>
          <Timeline.CardBody className="px-3 py-2.5">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {body.trim() ? body : 'No description provided.'}
            </p>
          </Timeline.CardBody>
        </Timeline.Card>
      </Timeline.Body>
    </Timeline.Item>
  );
}
