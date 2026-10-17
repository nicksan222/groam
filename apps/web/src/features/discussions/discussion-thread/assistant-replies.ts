import type { DiscussionMessage } from '@/types/discussions';

/**
 * Groam replies grouped under the message that asked for them; the agent gives a reply its
 * prompt's order. Replies without a loaded prompt stay in the thread on their own.
 */
export function groupAssistantReplies(messages: DiscussionMessage[]) {
  const promptKeys = new Map<number, string>();
  const repliesByPrompt = new Map<string, DiscussionMessage[]>();
  const attached = new Set<string>();
  for (const message of messages) {
    if (message.role === 'user') {
      promptKeys.set(message.order, message.key);
    } else if (message.role === 'assistant') {
      const promptKey = promptKeys.get(message.order);
      if (!promptKey) continue;
      repliesByPrompt.set(promptKey, [...(repliesByPrompt.get(promptKey) ?? []), message]);
      attached.add(message.key);
    }
  }
  return { attached, repliesByPrompt };
}
