import { Bell } from '@groam/icons';
import { SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem } from '@groam/ui/components/sidebar';
import { useSidebar } from '@groam/ui/hooks/use-sidebar';
import { Link } from '@/features/workspace/navigation/router';
import { navigationItemIsActive } from '@/features/workspace/workspace-sidebar/sidebar-nav';
import { useLocation } from '@/lib/navigation/router';
import { testIds } from '@/lib/test-ids';
import { useWorkspaceNotifications } from './hooks/use-workspace-notifications';

export function InboxSidebarNav() {
  const { pathname } = useLocation();
  const { setOpenMobile } = useSidebar();
  const { unread } = useWorkspaceNotifications();
  const unreadLabel = unread > 9 ? '9+' : String(unread);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        className={unread > 0 ? 'pr-8' : undefined}
        isActive={navigationItemIsActive(pathname, '/inbox')}
        tooltip="Inbox"
      >
        <Link data-testid={testIds.navInbox} onClick={() => setOpenMobile(false)} to="/inbox">
          <Bell />
          <span>Inbox</span>
        </Link>
      </SidebarMenuButton>
      {unread > 0 ? <SidebarMenuBadge>{unreadLabel}</SidebarMenuBadge> : null}
    </SidebarMenuItem>
  );
}
