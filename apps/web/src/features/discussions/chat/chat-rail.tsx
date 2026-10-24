import { Search } from '@groam/icons';
import { Input } from '@groam/ui/components/input';
import { SHELL_PANE_BOTTOM_NAV } from '@groam/ui/lib/shell-layout';
import { cn } from '@groam/ui/lib/utils';
import { useState } from 'react';
import type { DiscussionListItem } from '@/features/discussions/hooks/use-discussions';
import { ChatList } from './chat-list';

/** Whether a chat's title or one of its people matches a lowercased query. */
function matches(discussion: DiscussionListItem, query: string) {
  return [discussion.title, ...discussion.members.map((member) => member.name)].some((value) =>
    value.toLocaleLowerCase().includes(query)
  );
}

/**
 * The chats beside an open conversation: a find field once there is something to find, then the
 * list, scrolling on its own. The caller places and sizes it.
 */
export function ChatRail({
  activeDiscussionId,
  discussions,
  isLoading,
  onCreate
}: {
  activeDiscussionId?: string;
  discussions: DiscussionListItem[];
  isLoading: boolean;
  onCreate?: () => void;
}) {
  const [search, setSearch] = useState('');
  const query = search.trim().toLocaleLowerCase();
  const shown = query
    ? discussions.filter((discussion) => matches(discussion, query))
    : discussions;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {discussions.length > 0 ? (
        <div className="shrink-0 px-4 pt-3 pb-2">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-2.5 z-10 size-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              aria-label="Search chats"
              className="h-8 bg-background pl-8 text-[13px] shadow-none md:text-[13px]"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Find a chat or person"
              type="search"
              value={search}
            />
          </div>
        </div>
      ) : null}
      <div
        className={cn(
          'min-h-0 flex-1 overflow-y-auto overscroll-contain',
          SHELL_PANE_BOTTOM_NAV,
          'md:pb-3'
        )}
      >
        {query && shown.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground" role="status">
            No chats match “{search.trim()}”.
          </p>
        ) : (
          <ChatList
            activeDiscussionId={activeDiscussionId}
            discussions={shown}
            isLoading={isLoading}
            onCreate={onCreate}
          />
        )}
      </div>
    </div>
  );
}
