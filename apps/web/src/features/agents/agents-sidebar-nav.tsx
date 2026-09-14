import { Badge } from '@groam/ui/components/badge';
import { SidebarMenuButton, SidebarMenuItem } from '@groam/ui/components/sidebar';
import { useSidebar } from '@groam/ui/hooks/use-sidebar';
import { SIDEBAR_COUNT_BADGE_CLASS } from '@groam/ui/lib/sidebar-collapsible';
import { useLocation } from '@tanstack/react-router';
import { Bot } from 'lucide-react';
import { Link } from '@/features/workspace/navigation/router';
import { navigationItemIsActive } from '@/features/workspace/workspace-sidebar/sidebar-nav';
import { testIds } from '@/lib/test-ids';
import { useAgentRoster } from './hooks/use-agent-roster';

export function AgentsSidebarNav() {
  const { pathname } = useLocation();
  const { setOpenMobile } = useSidebar();
  const { agents } = useAgentRoster();
  const activeCount = (agents ?? []).reduce((sum, agent) => sum + agent.activeRunCount, 0);
  const unreadLabel = activeCount > 9 ? '9+' : String(activeCount);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={navigationItemIsActive(pathname, '/agents')}
        tooltip="Agents"
      >
        <Link data-testid={testIds.navAgents} onClick={() => setOpenMobile(false)} to="/agents">
          <Bot />
          <span>Agents</span>
          {activeCount > 0 ? (
            <Badge className={SIDEBAR_COUNT_BADGE_CLASS} variant="secondary">
              {unreadLabel}
            </Badge>
          ) : null}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
