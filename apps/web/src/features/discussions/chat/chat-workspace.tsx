import { Plus } from '@groam/icons';
import { PageLoading } from '@groam/ui/components/page-loading';
import Shell from '@groam/ui/components/shell/client';
import { cn } from '@groam/ui/lib/utils';
import type { ReactNode } from 'react';
import { CreateDiscussionDialog } from '@/features/discussions/discussion-create/create-discussion-dialog';
import { DiscussionThreadHeader } from '@/features/discussions/discussion-thread/discussion-thread-header';
import { useDiscussions } from '@/features/discussions/hooks/use-discussions';
import { useOpenState } from '@/features/workspace/hooks/use-open-state';
import { useParams } from '@/features/workspace/navigation/router';
import { useNavigate } from '@/lib/navigation/router';
import { testIds } from '@/lib/test-ids';
import { ChatRail } from './chat-rail';

export function ChatWorkspace({ children }: { children: ReactNode }) {
  const { discussions, isLoading } = useDiscussions();
  const createDialog = useOpenState(false);
  const navigate = useNavigate();
  const params = useParams();
  const activeDiscussionId =
    typeof params.discussionId === 'string' ? params.discussionId : undefined;
  const hasChatOpen = Boolean(activeDiscussionId);
  const activeDiscussion = discussions.find((item) => item.id === activeDiscussionId);
  const newChat = (
    <Shell.Action
      data-testid={testIds.newChat}
      icon={Plus}
      label="New chat"
      onClick={createDialog.openPanel}
    />
  );

  if (isLoading) {
    return (
      <Shell>
        <PageLoading label="Loading chats…" />
      </Shell>
    );
  }

  return (
    <Shell>
      <Shell.BannerLayout dockLift={hasChatOpen}>
        {activeDiscussion ? (
          <DiscussionThreadHeader actions={newChat} discussion={activeDiscussion} />
        ) : (
          <Shell.Header
            actions={discussions.length > 0 ? newChat : null}
            meta="Every conversation in the group, trip chats included."
            title="Chats"
            titleProps={{ 'data-testid': testIds.chatsTitle }}
          />
        )}
        <Shell.PageBody layout="bleed">
          <div className="flex h-full min-h-0 min-w-0 flex-1 overflow-hidden">
            <aside
              className={cn(
                'flex min-h-0 w-full shrink-0 flex-col md:border-t md:border-border',
                'md:w-72 md:border-r lg:w-80 xl:w-[21rem]',
                hasChatOpen ? 'hidden md:flex' : 'flex'
              )}
            >
              <ChatRail
                activeDiscussionId={activeDiscussionId}
                discussions={discussions}
                isLoading={isLoading}
                onCreate={createDialog.openPanel}
              />
            </aside>

            <section
              className={cn(
                'min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:border-t md:border-border',
                hasChatOpen ? 'flex' : 'hidden md:flex'
              )}
            >
              {children}
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
        </Shell.PageBody>
      </Shell.BannerLayout>
    </Shell>
  );
}
