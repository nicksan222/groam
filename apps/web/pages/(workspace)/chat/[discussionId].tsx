import type { Id } from '@groam/backend/data-model';
import { DiscussionThreadView } from '@/features/discussions/discussion-thread/discussion-thread-view';
import { ResearchChatRedirect } from '@/features/research/research-thread/research-chat-redirect';
import { useParams } from '@/features/workspace/navigation/router';

export default function DiscussionThreadPage() {
  const { discussionId = '' } = useParams<{ discussionId: string }>();
  return (
    <ResearchChatRedirect discussionId={discussionId}>
      <DiscussionThreadView discussionId={discussionId as Id<'discussions'>} />
    </ResearchChatRedirect>
  );
}
