import type { ConversationTimelineItem } from '@groam/ui/components/conversation-timeline';
import type { DiscussionTimelineEvent } from '@/types/discussions';

export type { DiscussionTimelineEvent };

/**
 * Places events among messages by time. Until every page is loaded, events older than the
 * oldest loaded message stay hidden so they do not pile up above a partial history.
 */
export function mergeTimelineEvents(
  messages: DiscussionTimelineEvent[],
  events: DiscussionTimelineEvent[],
  complete: boolean
): ConversationTimelineItem[] {
  const oldest = Math.min(...messages.map((message) => message.createdAt));
  const visible = complete ? events : events.filter((event) => event.createdAt >= oldest);
  return [...messages, ...visible]
    .sort((left, right) => left.createdAt - right.createdAt)
    .map(({ content, key }) => ({ content, key }));
}
