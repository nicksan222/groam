import { Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './button';
import {
  MessageScroller,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport
} from './message-scroller';

export type ConversationTimelineItem = {
  content: ReactNode;
  key: string;
};

export type ConversationTimelineProps = {
  empty: ReactNode;
  isLoading: boolean;
  items: ConversationTimelineItem[];
  loadMore: (count: number) => void;
  pending?: ReactNode;
  status: string;
};

export function ConversationTimeline({
  empty,
  isLoading,
  items,
  loadMore,
  pending,
  status
}: ConversationTimelineProps) {
  return (
    <MessageScrollerProvider>
      <MessageScroller className="min-h-0 flex-1 bg-background">
        <MessageScrollerViewport aria-live="polite">
          <MessageScrollerContent className="justify-end gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4">
            {status === 'CanLoadMore' && (
              <MessageScrollerItem className="text-center">
                <Button
                  className="rounded-full border border-border/60 bg-background/70 px-3 text-xs shadow-xs backdrop-blur-sm"
                  onClick={() => loadMore(30)}
                  size="sm"
                  variant="ghost"
                >
                  Load earlier messages
                </Button>
              </MessageScrollerItem>
            )}
            {isLoading && <ConversationLoading />}
            {!isLoading && items.length === 0 && !pending && empty}
            {items.map((item, index) => (
              <MessageScrollerItem
                key={item.key}
                scrollAnchor={index === items.length - 1 && !pending}
              >
                {item.content}
              </MessageScrollerItem>
            ))}
            {pending && <MessageScrollerItem scrollAnchor>{pending}</MessageScrollerItem>}
          </MessageScrollerContent>
        </MessageScrollerViewport>
      </MessageScroller>
    </MessageScrollerProvider>
  );
}

function ConversationLoading() {
  return (
    <MessageScrollerItem className="my-auto py-10" scrollAnchor>
      <div aria-label="Loading messages" className="mx-auto w-full max-w-sm" role="status">
        <span className="mx-auto grid size-10 place-items-center rounded-xl bg-muted/50 text-muted-foreground">
          <Sparkles className="size-4 animate-pulse" />
        </span>
        <p className="mt-3 text-center text-xs font-medium text-muted-foreground">
          Bringing the conversation into view…
        </p>
        <div aria-hidden="true" className="mt-5 grid gap-3">
          <span className="h-9 w-3/5 animate-pulse rounded-2xl rounded-bl-md bg-muted" />
          <span className="ml-auto h-11 w-4/5 animate-pulse rounded-2xl rounded-br-md bg-secondary" />
          <span className="h-8 w-2/5 animate-pulse rounded-2xl rounded-bl-md bg-muted" />
        </div>
      </div>
    </MessageScrollerItem>
  );
}
