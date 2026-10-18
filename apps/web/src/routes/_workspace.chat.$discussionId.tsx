import type { Id } from '@groam/backend/data-model';
import { createFileRoute } from '@tanstack/react-router';
import { DiscussionThreadView } from '@/features/discussions/discussion-thread/discussion-thread-view';
import { ResearchChatRedirect } from '@/features/research/research-thread/research-chat-redirect';
import { useResolvedParams } from '@/features/workspace/hooks/reference-context';

export const Route = createFileRoute('/_workspace/chat/$discussionId')({
  component: DiscussionThreadPage
});

function DiscussionThreadPage() {
  const { discussionId } = useResolvedParams(Route.useParams());
  return (
    <ResearchChatRedirect discussionId={discussionId}>
      <DiscussionThreadView discussionId={discussionId as Id<'discussions'>} />
    </ResearchChatRedirect>
  );
}
