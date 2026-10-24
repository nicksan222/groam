import type { PropsWithChildren } from 'react';
import { useResearchChatRedirect } from '@/features/research/hooks/use-research-chat-redirect';
import { Navigate } from '@/lib/navigation/router';

/**
 * `/chat/$id` resolves an id to its one page: a research lands on the trip's research page, and
 * every other chat, trip chats included, renders here.
 */
export function ResearchChatRedirect({
  children,
  discussionId
}: PropsWithChildren<{ discussionId: string }>) {
  const target = useResearchChatRedirect(discussionId);
  if (target) {
    return (
      <Navigate
        params={{ researchId: target.researchId, tripId: target.tripId }}
        replace
        to="/trips/$tripId/research/$researchId"
      />
    );
  }
  return children;
}
