import { OPEN_ASSISTANT_EVENT } from '@groam/ai/ui/chat/ai-assistant-widget';
import { Sparkles } from '@groam/icons';
import {
  Sidebar,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail
} from '@groam/ui/components/sidebar';
import { useSidebar } from '@groam/ui/hooks/use-sidebar';
import { ChatsSidebarNav } from '@/features/discussions/chats-sidebar-nav';
import { InboxSidebarNav } from '@/features/inbox/inbox-sidebar-nav';
import { TripSidebarBlock } from '@/features/trips/trip-switcher/trip-sidebar-block';
import { Link } from '@/features/workspace/navigation/router';
import {
  homeNavigation,
  navigationItemIsActive,
  settingsNavigation
} from '@/features/workspace/workspace-sidebar/sidebar-nav';
import { useLocation } from '@/lib/navigation/router';
import type { SidebarNavItem } from '@/types/workspace';
import { AccountMenu } from './account-menu';
import { isWorkspaceAssistantVisible } from './workspace-assistant-visibility';

export function WorkspaceSidebar() {
  return (
    <Sidebar className="[view-transition-name:workspace-sidebar]" collapsible="icon">
      <TripSidebarBlock />
      <SidebarFooter className="gap-1 border-t border-sidebar-border/70 p-2">
        <SidebarMenu>
          <NavigationItem {...homeNavigation} />
          <AssistantSidebarButton />
          <InboxSidebarNav />
          <ChatsSidebarNav />
          <NavigationItem {...settingsNavigation} />
        </SidebarMenu>
        <div className="border-t border-sidebar-border/60 pt-1">
          <AccountMenu />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function NavigationItem({ icon: Icon, label, testId, to }: SidebarNavItem) {
  const { pathname } = useLocation();
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={navigationItemIsActive(pathname, to)} tooltip={label}>
        <Link data-testid={testId} onClick={() => setOpenMobile(false)} to={to}>
          <Icon />
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

/** Opens the assistant drawer; shown only where the assistant is available. */
function AssistantSidebarButton() {
  const { pathname } = useLocation();
  const { setOpenMobile } = useSidebar();
  if (!isWorkspaceAssistantVisible(pathname)) return null;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={() => {
          setOpenMobile(false);
          window.dispatchEvent(new Event(OPEN_ASSISTANT_EVENT));
        }}
        tooltip="Ask Groam"
      >
        <Sparkles />
        <span>Ask Groam</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
