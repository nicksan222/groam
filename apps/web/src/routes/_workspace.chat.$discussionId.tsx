import type { Id } from '@groam/backend/data-model';
import { createFileRoute } from '@tanstack/react-router';
import { DiscussionThreadView } from '@/features/discussions/discussion-thread/discussion-thread-view';
import { useResolvedParams } from '@/features/workspace/hooks/reference-context';

export const Route = createFileRoute('/_workspace/chat/$discussionId')({
  component: DiscussionThreadPage
});

function DiscussionThreadPage() {
  const { discussionId } = useResolvedParams(Route.useParams());
  return <DiscussionThreadView discussionId={discussionId as Id<'discussions'>} />;
}
