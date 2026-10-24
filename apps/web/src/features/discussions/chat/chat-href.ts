/** Where a chat lives: every chat, trip chats included, opens under `/chat`. */
export function chatHref(chat: { discussionId: string; tripId?: string | null }) {
  return { params: { discussionId: chat.discussionId }, to: '/chat/$discussionId' as const };
}
