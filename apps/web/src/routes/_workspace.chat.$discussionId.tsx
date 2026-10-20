import type { Id } from '@groam/backend/data-model';
import { createFileRoute } from '@tanstack/react-router';
import { DiscussionEntryView } from '@/features/discussions/discussion-thread/discussion-entry-view';
import { useResolvedParams } from '@/features/workspace/hooks/reference-context';

export const Route = createFileRoute('/_workspace/chat/$discussionId')({
  component: DiscussionThreadPage
});

function DiscussionThreadPage() {
  const { discussionId } = useResolvedParams(Route.useParams());
  return <DiscussionEntryView discussionId={discussionId as Id<'discussions'>} />;
}
