import {
  ChatConversation,
  ChatDatePill,
  ChatLoadingState,
  useChatScroll
} from '@groam/ui/components/chat';
import { cn } from '@groam/ui/lib/utils';
import type { ReactNode } from 'react';
import { chatDayLabel, isSameChatDay } from '#src/components/chat/lib/chat-day';
import { Button } from './button';

export type ChatTimelineItem = {
  content: ReactNode;
  /** When set, a sticky coss date pill opens each new calendar day. */
  createdAt?: number;
  key: string;
};

export type ChatTimelineProps = {
  className?: string;
  contentClassName?: string;
  empty: ReactNode;
  isLoading: boolean;
  items: ChatTimelineItem[];
  /** Accessible name for the message log. */
  label?: string;
  loadMore: (count: number) => void;
  pending?: ReactNode;
  /** Convex pagination status; `CanLoadMore` shows the earlier-messages control. */
  status: string;
};

/** A paginated message log on the coss chat conversation: follows new messages, offers jump-to-latest. */
export function ChatTimeline({
  className,
  contentClassName,
  empty,
  isLoading,
  items,
  label = 'Messages',
  loadMore,
  pending,
  status
}: ChatTimelineProps) {
  const scroll = useChatScroll({
    itemCount: items.length + (pending ? 1 : 0),
    layoutKey: isLoading ? 'loading' : (items.at(-1)?.key ?? 'empty')
  });

  return (
    <ChatConversation
      className={cn('bg-background [--chat-surface:var(--color-background)]', className)}
      contentClassName={cn(
        'flex min-h-full flex-col justify-end gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4',
        contentClassName
      )}
      jumpLabel="Latest"
      label={label}
      live="polite"
      scroll={scroll}
    >
      {status === 'CanLoadMore' && (
        <div className="text-center">
          <Button
            className="rounded-full px-3 text-xs"
            onClick={() => {
              scroll.updatePosition();
              loadMore(30);
            }}
            size="sm"
            variant="outline"
          >
            Load earlier messages
          </Button>
        </div>
      )}
      {isLoading && <ChatLoadingState label="Loading messages" />}
      {!isLoading && items.length === 0 && !pending && empty}
      <TimelineItems items={items} />
      {pending}
    </ChatConversation>
  );
}

function TimelineItems({ items }: { items: ChatTimelineItem[] }) {
  let previousDay: number | undefined;
  return items.map((item) => {
    const { createdAt } = item;
    const startsDay =
      createdAt !== undefined &&
      (previousDay === undefined || !isSameChatDay(previousDay, createdAt));
    if (createdAt !== undefined) previousDay = createdAt;
    const row = (
      <div className="min-w-0" key={item.key}>
        {item.content}
      </div>
    );
    if (!startsDay) return row;
    return [
      <ChatDatePill key={`day-${item.key}`}>
        <time dateTime={new Date(createdAt).toISOString()}>{chatDayLabel(createdAt)}</time>
      </ChatDatePill>,
      row
    ];
  });
}
