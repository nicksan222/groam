import { Compass, Link2 } from '@groam/icons';
import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { Badge } from '@groam/ui/components/badge';
import { Button } from '@groam/ui/components/button';
import { List } from '@groam/ui/components/list';
import { initials, avatarClasses } from '@groam/ui/lib/avatar';
import { cn } from '@groam/ui/lib/utils';
import { compactAge } from '@/features/trip-queue/queue-age';
import { testIds } from '@/lib/test-ids';
import type { ResearchSummary } from '@/types/research';

export function ResearchListRow({
  onOpen,
  research
}: {
  onOpen: (research: ResearchSummary) => void;
  research: ResearchSummary;
}) {
  const message = research.lastMessage;
  return (
    <List.Row
      attention={research.unread}
      data-research-id={research.id}
      data-unread={research.unread || undefined}
      data-testid={testIds.researchCard}
    >
      <List.Leading />
      <List.Icon>
        <Compass
          aria-hidden
          className={cn('size-4', research.unread ? 'text-info' : 'text-muted-foreground')}
        />
      </List.Icon>
      <List.Main>
        {research.unread ? <span className="sr-only">Unread. </span> : null}
        <List.Title asChild>
          <Button onClick={() => onOpen(research)} title={research.title} unstyled>
            {research.title}
          </Button>
        </List.Title>
        <List.Description title={research.brief ?? undefined}>
          <span>{research.brief ?? 'No brief'}</span>
          <span aria-hidden className="mx-2">
            ·
          </span>
          <span title={message?.text}>
            {message ? `${message.authorName}: ${message.text}` : 'No messages yet'}
          </span>
        </List.Description>
      </List.Main>
      <List.Meta>
        <Badge aria-label={`${research.linkCount} links`} variant="outline">
          <Link2 aria-hidden />
          {research.linkCount}
        </Badge>
      </List.Meta>
      <List.Avatar>
        {message ? (
          <Avatar
            aria-label={`Last reply: ${message.authorName}`}
            className="size-[22px] flex-none"
            role="img"
            title={`Last reply: ${message.authorName}`}
          >
            <AvatarFallback
              className={cn('text-[9px] font-medium', avatarClasses(message.authorName))}
            >
              {initials(message.authorName)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <span
            aria-label="No replies"
            className="box-border size-[22px] flex-none rounded-full border-[1.5px] border-dashed border-input"
            role="img"
          />
        )}
      </List.Avatar>
      <List.Age>
        <time
          dateTime={new Date(research.updatedAt).toISOString()}
          title={`Updated ${new Date(research.updatedAt).toLocaleString()}`}
        >
          {compactAge(research.updatedAt)}
        </time>
      </List.Age>
    </List.Row>
  );
}
