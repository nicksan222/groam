import type { ChatTimelineItem } from '@groam/ui/components/chat-timeline';
import type { DiscussionTimelineEvent } from '@/types/discussions';

export type { DiscussionTimelineEvent };

/**
 * Places events among messages by time, keeping times for the timeline's date pills. Until every
 * page is loaded, events older than the oldest loaded message stay hidden so they do not pile up
 * above a partial history.
 */
export function mergeTimelineEvents(
  messages: DiscussionTimelineEvent[],
  events: DiscussionTimelineEvent[],
  complete: boolean
): ChatTimelineItem[] {
  const oldest = Math.min(...messages.map((message) => message.createdAt));
  const visible = complete ? events : events.filter((event) => event.createdAt >= oldest);
  return [...messages, ...visible]
    .sort((left, right) => left.createdAt - right.createdAt)
    .map(({ content, createdAt, key }) => ({ content, createdAt, key }));
}
