import { useSetAgentContext } from '@groam/ui/ai/context/agent-context';
import { Button } from '@groam/ui/components/button';
import { PageLoading } from '@groam/ui/components/page-loading';
import { cn } from '@groam/ui/lib/utils';
import { useNavigate } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { CreateDiscussionDialog } from '@/features/discussions/discussion-create/create-discussion-dialog';
import { useDiscussions } from '@/features/discussions/hooks/use-discussions';
import { useOpenState } from '@/features/workspace/hooks/use-open-state';
import { useParams } from '@/features/workspace/navigation/router';
import { useWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { testIds } from '@/lib/test-ids';
import { ChatEmptyPane } from './chat-empty-pane';
import { ChatList } from './chat-list';

export function ChatWorkspace({ children }: { children: ReactNode }) {
  const { activeOrganization } = useWorkspace();
  const { discussions, isLoading } = useDiscussions();
  const createDialog = useOpenState(false);
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const activeDiscussionId =
    typeof params.discussionId === 'string' ? params.discussionId : undefined;
  const hasChatOpen = Boolean(activeDiscussionId);

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

  if (isLoading) return <PageLoading label="Loading chats…" />;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 overflow-hidden">
      <aside
        className={cn(
          'flex min-h-0 w-full shrink-0 flex-col bg-background',
          'md:w-[22rem] md:border-r md:border-border lg:w-[26rem] xl:w-[28rem]',
          hasChatOpen ? 'hidden md:flex' : 'flex'
        )}
      >
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 px-4">
          <div className="min-w-0">
            <h1
              className="truncate text-[17px] font-semibold tracking-tight"
              data-testid={testIds.chatsTitle}
            >
              Chats
            </h1>
          </div>
          {isLoading || discussions.length > 0 ? (
            <Button
              aria-label="New chat"
              className="shrink-0"
              data-testid={testIds.newChat}
              onClick={createDialog.openPanel}
              size="icon-sm"
              variant="ghost"
            >
              <Plus />
            </Button>
          ) : null}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0">
          <ChatList
            activeDiscussionId={activeDiscussionId}
            discussions={discussions}
            isLoading={isLoading}
            onCreate={createDialog.openPanel}
          />
        </div>
      </aside>

      <section
        className={cn(
          'min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
          hasChatOpen ? 'flex' : 'hidden md:flex'
        )}
      >
        {hasChatOpen ? children : <ChatEmptyPane />}
      </section>

      <CreateDiscussionDialog
        key={createDialog.open ? 'open' : 'closed'}
        onClose={createDialog.closePanel}
        onCreated={(discussionId) => {
          createDialog.closePanel();
          void navigate({ params: { discussionId }, to: '/chat/$discussionId' });
        }}
        open={createDialog.open}
      />
    </div>
  );
}
