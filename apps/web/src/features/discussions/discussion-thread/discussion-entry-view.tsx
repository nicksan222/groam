import type { Id } from '@groam/backend/data-model';
import { MessageSquare } from '@groam/icons';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { ResearchChatRedirect } from '@/features/research/research-thread/research-chat-redirect';
import { EntityParticipationBoundary } from '@/features/trips/trip-detail/entity-participation-boundary';
import { DiscussionThreadView } from './discussion-thread-view';

export function DiscussionEntryView({ discussionId }: { discussionId: Id<'discussions'> }) {
  return (
    <EntityParticipationBoundary
      reference={discussionId}
      table="discussions"
      loadingLabel="Opening chat…"
      missing={
        <EmptyScreen
          headline="Chat not found"
          description="It may have been removed, or you are not a participant."
          icon={MessageSquare}
        />
      }
    >
      <ResearchChatRedirect discussionId={discussionId}>
        <DiscussionThreadView discussionId={discussionId} />
      </ResearchChatRedirect>
    </EntityParticipationBoundary>
  );
}
