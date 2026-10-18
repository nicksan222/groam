import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { AvatarImage } from '@groam/ui/components/avatar-image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@groam/ui/components/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail
} from '@groam/ui/components/sidebar';
import { toast } from '@groam/ui/components/toast';
import { useSidebar } from '@groam/ui/hooks/use-sidebar';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { Check, ChevronsUpDown, LogIn, Plus, Settings } from 'lucide-react';
import { AgentsSidebarNav } from '@/features/agents/agents-sidebar-nav';
import { ChatsSidebarNav } from '@/features/discussions/chats-sidebar-nav';
import { IdeasSidebarNav } from '@/features/ideas/ideas-sidebar-nav';
import { InboxSidebarNav } from '@/features/inbox/inbox-sidebar-nav';
import { IssuesSidebarNav } from '@/features/issues/issues-sidebar-nav';
import { TripsSidebarNav } from '@/features/trips/trips-sidebar-nav';
import { Link } from '@/features/workspace/navigation/router';
import {
  manageNavigation,
  navigationItemIsActive,
  primaryNavigation
} from '@/features/workspace/workspace-sidebar/sidebar-nav';
import { errorMessage } from '@/lib/errors';
import { testIds } from '@/lib/test-ids';
import type { SidebarNavItem } from '@/types/workspace';
import { AccountMenu } from './account-menu';
import { SidebarSearchButton } from './sidebar-search-button';
import { useWorkspaceDialogs } from './workspace-dialog-state';
import { useWorkspace } from './workspace-state';

export function WorkspaceSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-2 border-b border-sidebar-border/70 p-3 group-data-[collapsible=icon]:p-2">
        <OrganizationMenu />
        <SidebarSearchButton />
      </SidebarHeader>
      <SidebarContent className="py-2">
        <SidebarGroup className="px-2 py-1">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              <NavigationItem {...primaryNavigation[0]} />
              <TripsSidebarNav />
              <IdeasSidebarNav />
              <IssuesSidebarNav />
              <ChatsSidebarNav />
              <AgentsSidebarNav />
              <InboxSidebarNav />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-1 border-t border-sidebar-border/70 p-2">
        <SidebarMenu>
          {manageNavigation.map((item) => (
            <NavigationItem key={item.to} {...item} />
          ))}
        </SidebarMenu>
        <div className="border-t border-sidebar-border/60 pt-1">
          <AccountMenu />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function NavigationItem({ icon: Icon, label, to }: SidebarNavItem) {
  const { pathname } = useLocation();
  const { setOpenMobile } = useSidebar();
  const navTestId = to === '/' ? testIds.navHome : testIds.navSettings;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={navigationItemIsActive(pathname, to)} tooltip={label}>
        <Link data-testid={navTestId} onClick={() => setOpenMobile(false)} to={to}>
          <Icon />
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function OrganizationMenu() {
  const { setOpenMobile } = useSidebar();
  const { activeOrganization, activeRole, organizations, switchOrganization } = useWorkspace();
  const { openDialog } = useWorkspaceDialogs();
  const navigate = useNavigate();

  const switchTo = async (organizationId: string) => {
    try {
      await switchOrganization(organizationId);
      setOpenMobile(false);
      await navigate({ to: '/' });
    } catch (error: unknown) {
      toast.error(errorMessage(error, 'Unable to switch group'));
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          className="h-11 rounded-lg border border-sidebar-border bg-sidebar px-2 shadow-xs hover:border-sidebar-ring/40"
          data-group-name={activeOrganization.name}
          data-testid={testIds.groupSwitcher}
          size="lg"
          tooltip={activeOrganization.name}
        >
          <Avatar className="size-7 rounded-md">
            <AvatarImage alt={activeOrganization.name} src={activeOrganization.logo ?? ''} />
            <AvatarFallback className="rounded-md bg-primary text-xs font-semibold text-primary-foreground">
              {activeOrganization.name.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-medium text-sidebar-accent-foreground">
              {activeOrganization.name}
            </span>
            <span className="truncate text-[11px] capitalize text-sidebar-foreground">
              {activeRole}
            </span>
          </span>
          <ChevronsUpDown className="ml-auto size-3.5 group-data-[collapsible=icon]:hidden" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64" side="right">
        <DropdownMenuLabel>Groups</DropdownMenuLabel>
        {organizations.map((organization) => (
          <DropdownMenuItem
            data-group-name={organization.name}
            data-testid={testIds.groupSwitcherItem}
            key={organization.id}
            onClick={() => void switchTo(organization.id)}
          >
            <Avatar className="size-6 rounded">
              <AvatarImage alt={organization.name} src={organization.logo ?? ''} />
              <AvatarFallback className="rounded bg-muted text-xs font-semibold">
                {organization.name.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">{organization.name}</span>
            {organization.id === activeOrganization.id ? <Check className="ml-auto" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          data-testid={testIds.groupSwitcherJoin}
          onClick={() => {
            setOpenMobile(false);
            openDialog('join');
          }}
        >
          <LogIn /> Join with code
        </DropdownMenuItem>
        <DropdownMenuItem
          data-testid={testIds.groupSwitcherNew}
          onClick={() => {
            setOpenMobile(false);
            openDialog('create-organization');
          }}
        >
          <Plus /> New group
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setOpenMobile(false);
            void navigate({ params: { section: 'group' }, to: '/settings/$section' });
          }}
        >
          <Settings /> Group settings
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
