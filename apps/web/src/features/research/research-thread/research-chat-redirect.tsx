import { PageLoading } from '@groam/ui/components/page-loading';
import { Navigate } from '@tanstack/react-router';
import type { PropsWithChildren } from 'react';
import { useResearchChatRedirect } from '@/features/research/hooks/use-research-chat-redirect';

/** `/chat/$id` for a research id lands on the trip's research page; any other chat renders. */
export function ResearchChatRedirect({
  children,
  discussionId
}: PropsWithChildren<{ discussionId: string }>) {
  const target = useResearchChatRedirect(discussionId);
  if (target === undefined) return <PageLoading label="Opening chat…" />;
  if (target) {
    return <Navigate params={target} replace to="/trips/$tripId/research/$researchId" />;
  }
  return children;
}
