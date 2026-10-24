import { useSetAgentContext } from '@groam/ai/ui/context/agent-context';
import type { Id } from '@groam/backend/data-model';
import { MessageSquare } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { PageLoading } from '@groam/ui/components/page-loading';
import Shell from '@groam/ui/components/shell/client';
import { useDiscussions } from '@/features/discussions/hooks/use-discussions';
import { Link } from '@/features/workspace/navigation/router';
import { DiscussionThreadHeader, type ThreadBack } from './discussion-thread-header';
import { DiscussionThreadIntro } from './discussion-thread-intro';
import { DiscussionThreadWithPolls } from './discussion-thread-with-polls';
import { DiscussionWaitBanner } from './discussion-wait-banner';

/** `back` replaces the arrow to the chat list, for a chat that lives in a trip. */
export function DiscussionThreadView({
  back,
  discussionId,
  withHeader = true
}: {
  back?: ThreadBack;
  discussionId: Id<'discussions'>;
  /** False where the page already shows the chat's header (the chat page owns it). */
  withHeader?: boolean;
}) {
  const { discussions, isLoading: isListLoading } = useDiscussions();
  const discussion = discussions.find((item) => item.id === discussionId);
  const showLoading = isListLoading || !discussion;

  useSetAgentContext(
    discussion
      ? {
          capabilities: [],
          data: {
            discussionId: discussion.id,
            memberNames: discussion.members.map((member) => member.name),
            title: discussion.title
          },
          description:
            'Help this shared group chat plan and decide without taking private-chat context.',
          key: `chat:${discussion.id}`,
          title: discussion.title
        }
      : null
  );

  if (!isListLoading && !discussion) {
    return (
      <EmptyScreen
        buttonRaw={
          <Button asChild variant="outline">
            {back ? (
              <Link {...back.target}>{back.label}</Link>
            ) : (
              <Link to="/chat">Back to chats</Link>
            )}
          </Button>
        }
        description="It may have been removed, or you are not a participant."
        headline="Chat not found"
        icon={MessageSquare}
      />
    );
  }

  if (showLoading) {
    return withHeader ? (
      <Shell>
        <PageLoading label="Opening chat…" />
      </Shell>
    ) : (
      <PageLoading label="Opening chat…" />
    );
  }

  const body = (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <DiscussionWaitBanner discussionId={discussionId} />
      <DiscussionThreadWithPolls
        discussionId={discussionId}
        empty={<DiscussionThreadIntro discussion={discussion} />}
        threadId={discussion.threadId}
      />
    </div>
  );
  if (!withHeader) return body;
  return (
    <Shell>
      <Shell.BannerLayout dockLift>
        <DiscussionThreadHeader back={back} discussion={discussion} />
        <Shell.PageBody layout="bleed">{body}</Shell.PageBody>
      </Shell.BannerLayout>
    </Shell>
  );
}
