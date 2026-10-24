import type { DiscussionMessage } from '@/types/discussions';

/**
 * Changes when a message arrives or the newest message settles (for example the assistant
 * finishes or fails). It deliberately ignores streamed text so an open chat marks itself read
 * once per reply, not once per streamed chunk.
 */
export function discussionActivityKey(
  messages: ReadonlyArray<Pick<DiscussionMessage, 'assistantStatus' | 'key' | 'status'>>
): string {
  const last = messages.at(-1);
  if (!last) return '0';
  return `${messages.length}:${last.key}:${last.status}:${last.assistantStatus ?? ''}`;
}
