import { MessageSquare } from '@groam/icons';
import { SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem } from '@groam/ui/components/sidebar';
import { useSidebar } from '@groam/ui/hooks/use-sidebar';
import { useDiscussions } from '@/features/discussions/hooks/use-discussions';
import { Link } from '@/features/workspace/navigation/router';
import { navigationItemIsActive } from '@/features/workspace/workspace-sidebar/sidebar-nav';
import { useLocation } from '@/lib/navigation/router';
import { testIds } from '@/lib/test-ids';

/** The footer's Chats row: every chat in the group, trip chats included, with how many are unread. */
export function ChatsSidebarNav() {
  const { pathname } = useLocation();
  const { setOpenMobile } = useSidebar();
  const { discussions } = useDiscussions();
  const unread = discussions.filter((discussion) => discussion.unread).length;
  const unreadLabel = unread > 9 ? '9+' : String(unread);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        className={unread > 0 ? 'pr-8' : undefined}
        isActive={navigationItemIsActive(pathname, '/chat')}
        tooltip="Chats"
      >
        <Link
          aria-label={unread > 0 ? `Chats, ${unread} unread` : undefined}
          data-testid={testIds.navChats}
          onClick={() => setOpenMobile(false)}
          to="/chat"
        >
          <MessageSquare />
          <span>Chats</span>
        </Link>
      </SidebarMenuButton>
      {unread > 0 ? <SidebarMenuBadge aria-hidden>{unreadLabel}</SidebarMenuBadge> : null}
    </SidebarMenuItem>
  );
}
