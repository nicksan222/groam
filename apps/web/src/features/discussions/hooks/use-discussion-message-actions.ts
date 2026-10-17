import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { useMutation, useQuery } from 'convex/react';
import { useEffect } from 'react';

/**
 * `activityKey` changes whenever the open chat receives new content (messages arriving or
 * the assistant finishing), so the viewer's read marker keeps up while the chat stays open.
 */
export function useDiscussionMessageActions(
  discussionId: Id<'discussions'>,
  activityKey?: string | number
) {
  const markRead = useMutation(api.routes.discussions.mark.read.run);
  const reactions = useQuery(api.routes.discussions.messages.reactions.run, { discussionId });
  const react = useMutation(api.routes.discussions.messages.react.run);
  const editMessage = useMutation(api.routes.discussions.messages.edit.run);
  const removeMessage = useMutation(api.routes.discussions.messages.remove.run);

  useEffect(() => {
    void markRead({ discussionId });
  }, [activityKey, discussionId, markRead]);

  return {
    editMessage: (messageId: string, text: string) =>
      editMessage({ discussionId, messageId, text }),
    react: (messageId: string, emoji: string) => react({ discussionId, emoji, messageId }),
    reactions: reactions ?? [],
    removeMessage: (messageId: string) => removeMessage({ discussionId, messageId })
  };
}
