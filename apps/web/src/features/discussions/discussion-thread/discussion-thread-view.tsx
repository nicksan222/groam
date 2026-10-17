import { useSetAgentContext } from '@groam/ai/ui/context/agent-context';
import type { Id } from '@groam/backend/data-model';
import { Button } from '@groam/ui/components/button';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { PageLoading } from '@groam/ui/components/page-loading';
import { MessageSquare } from 'lucide-react';
import { useDiscussions } from '@/features/discussions/hooks/use-discussions';
import { Link } from '@/features/workspace/navigation/router';
import { DiscussionThreadBody } from './discussion-thread-body';
import { DiscussionThreadHeader } from './discussion-thread-header';

export function DiscussionThreadView({ discussionId }: { discussionId: Id<'discussions'> }) {
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
            <Link to="/chat">Back to chats</Link>
          </Button>
        }
        description="It may have been removed, or you are not a participant."
        headline="Chat not found"
        icon={MessageSquare}
      />
    );
  }

  if (showLoading) return <PageLoading label="Opening chat…" />;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <DiscussionThreadHeader discussion={discussion} />

      <DiscussionThreadBody discussionId={discussionId} threadId={discussion.threadId} />
    </div>
  );
}
