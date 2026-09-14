import {
  SidebarMenuButton,
  SidebarMenuSkeleton,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from '@groam/ui/components/sidebar';
import { SidebarCollapsibleItem } from '@groam/ui/components/sidebar-collapsible-item';
import { SidebarNestedLoadMore } from '@groam/ui/components/sidebar-nested-load-more';
import { useSidebar } from '@groam/ui/hooks/use-sidebar';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { MessageSquare } from 'lucide-react';
import { CreateDiscussionDialog } from '@/features/discussions/discussion-create/create-discussion-dialog';
import { useSidebarNestedPaging } from '@/features/workspace/hooks/use-sidebar-nested-paging';
import { useSidebarNestedVisible } from '@/features/workspace/hooks/use-sidebar-nested-visible';
import { useSidebarSectionOpen } from '@/features/workspace/hooks/use-sidebar-section-open';
import { Link, useParams } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import { useDiscussions } from './hooks/use-discussions';

export function ChatsSidebarNav() {
  const { pathname } = useLocation();
  const params = useParams({ strict: false });
  const { setOpenMobile } = useSidebar();
  const navigate = useNavigate();
  const { closeCreate, isCreateOpen, openCreate, showMore, visibleCount, canExpandVisible } =
    useSidebarNestedVisible('chat');

  const activeDiscussionId = typeof params.discussionId === 'string' ? params.discussionId : null;
  const chatsIndexActive = pathname === '/chat' || pathname === '/chat/';
  const [sectionOpen, setSectionOpen] = useSidebarSectionOpen('chat');
  const { discussions, isLoading } = useDiscussions(sectionOpen ? undefined : 'skip');
  const visibleDiscussions = discussions.slice(0, visibleCount);
  const { canLoadMore, onLoadMore } = useSidebarNestedPaging({
    canExpandVisible,
    showMore,
    total: discussions.length
  });

  return (
    <>
      <SidebarCollapsibleItem
        label="chat"
        onOpenChange={setSectionOpen}
        open={sectionOpen}
        trigger={
          <SidebarMenuButton asChild isActive={chatsIndexActive} tooltip="Chat">
            <Link data-testid={testIds.navChat} onClick={() => setOpenMobile(false)} to="/chat">
              <MessageSquare />
              <span>Chat</span>
            </Link>
          </SidebarMenuButton>
        }
      >
        {isLoading ? (
          <>
            <SidebarMenuSkeleton />
            <SidebarMenuSkeleton />
            <SidebarMenuSkeleton />
          </>
        ) : discussions.length === 0 ? (
          <SidebarMenuSubItem>
            <SidebarMenuSubButton onClick={openCreate}>
              <span>New chat</span>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        ) : (
          <>
            {visibleDiscussions.map((discussion) => (
              <SidebarMenuSubItem key={discussion.id}>
                <SidebarMenuSubButton asChild isActive={activeDiscussionId === discussion.id}>
                  <Link
                    onClick={() => setOpenMobile(false)}
                    params={{ discussionId: discussion.id }}
                    title={discussion.title}
                    to="/chat/$discussionId"
                  >
                    <span>{discussion.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
            {canLoadMore && <SidebarNestedLoadMore onLoadMore={onLoadMore} />}
          </>
        )}
      </SidebarCollapsibleItem>
      <CreateDiscussionDialog
        key={isCreateOpen ? 'open' : 'closed'}
        onClose={closeCreate}
        onCreated={(discussionId) => {
          closeCreate();
          setOpenMobile(false);
          void navigate({ params: { discussionId }, to: '/chat/$discussionId' });
        }}
        open={isCreateOpen}
      />
    </>
  );
}
