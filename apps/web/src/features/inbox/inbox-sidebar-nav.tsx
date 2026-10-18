import { Badge } from '@groam/ui/components/badge';
import { SidebarMenuButton, SidebarMenuItem } from '@groam/ui/components/sidebar';
import { useSidebar } from '@groam/ui/hooks/use-sidebar';
import { SIDEBAR_COUNT_BADGE_CLASS } from '@groam/ui/lib/sidebar-collapsible';
import { useLocation } from '@tanstack/react-router';
import { Bell } from 'lucide-react';
import { Link } from '@/features/workspace/navigation/router';
import { navigationItemIsActive } from '@/features/workspace/workspace-sidebar/sidebar-nav';
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
        isActive={navigationItemIsActive(pathname, '/inbox')}
        tooltip="Inbox"
      >
        <Link data-testid={testIds.navInbox} onClick={() => setOpenMobile(false)} to="/inbox">
          <Bell />
          <span>Inbox</span>
          {unread > 0 ? (
            <Badge className={SIDEBAR_COUNT_BADGE_CLASS} variant="secondary">
              {unreadLabel}
            </Badge>
          ) : null}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
