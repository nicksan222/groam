import { useSetAgentContext } from '@groam/ai/ui/context/agent-context';
import { useDiscussions } from '@/features/discussions/hooks/use-discussions';
import { useWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { ChatEmptyPane } from './chat-empty-pane';

/** The chat page before a conversation is picked: the rail beside it is the chat layout's. */
export function ChatInboxView() {
  const { activeOrganization } = useWorkspace();
  const { discussions } = useDiscussions();

  useSetAgentContext({
    capabilities: [],
    data: {
      discussionCount: discussions.length,
      discussions: discussions.slice(0, 12).map((discussion) => ({
        id: discussion.id,
        lastMessage: discussion.lastMessage?.text ?? null,
        memberCount: discussion.members.length,
        title: discussion.title
      })),
      groupName: activeOrganization.name
    },
    description: 'Summarize open group chats and help start or continue a planning conversation.',
    key: 'chat:inbox',
    title: `${activeOrganization.name} · Chat`
  });

  return <ChatEmptyPane />;
}
