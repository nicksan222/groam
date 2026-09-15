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
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail
} from '@groam/ui/components/sidebar';
import { toast } from '@groam/ui/components/toast';
import { useSidebar } from '@groam/ui/hooks/use-sidebar';
import { Outlet, useLocation, useNavigate } from '@tanstack/react-router';
import { Check, ChevronsUpDown, LogIn, Menu, Plus, Settings } from 'lucide-react';
import { ChatsSidebarNav } from '@/features/discussions/chats-sidebar-nav';
import { IdeasSidebarNav } from '@/features/ideas/ideas-sidebar-nav';
import { InboxSidebarNav } from '@/features/inbox/inbox-sidebar-nav';
import { IssuesSidebarNav } from '@/features/issues/issues-sidebar-nav';
import { TripsSidebarNav } from '@/features/trips/trips-sidebar-nav';
import { Link } from '@/features/workspace/navigation/router';
import { CommandPalette } from '@/features/workspace/workspace-command/command-palette';
import {
  isChatThreadRoute,
  manageNavigation,
  mobileNavigation,
  navigationItemIsActive,
  primaryNavigation,
  type SidebarNavItem
} from '@/features/workspace/workspace-sidebar/sidebar-nav';
import { errorMessage } from '@/lib/errors';
import { testIds } from '@/lib/test-ids';
import { AccountMenu } from './account-menu';
import { ReferenceContent } from './reference-content';
import { ConfirmDialogProvider } from './use-confirm-dialog';
import { WorkspaceAssistantWidget } from './workspace-assistant-widget';
import { useWorkspaceDialogs } from './workspace-dialog-state';
import { WorkspaceDialogs } from './workspace-dialogs';
import { useWorkspace } from './workspace-state';

export function WorkspaceShell() {
  const { activeOrganization } = useWorkspace();
  return (
    <SidebarProvider className="h-svh min-h-0 overflow-hidden">
      <ConfirmDialogProvider>
        <WorkspaceSidebar />
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <ReferenceContent>
            <Outlet />
          </ReferenceContent>
          <MobileNavigation />
        </div>
        <WorkspaceAssistantWidget organizationId={activeOrganization.id} />
        <WorkspaceDialogs />
        <CommandPalette />
      </ConfirmDialogProvider>
    </SidebarProvider>
  );
}

function MobileNavigation() {
  const { isMobile, toggleSidebar } = useSidebar();
  const { pathname } = useLocation();
  if (!isMobile) return null;
  if (isChatThreadRoute(pathname)) return null;

  return (
    <>
      <div className="h-16 shrink-0 md:hidden" />
      <nav
        aria-label="Mobile navigation"
        className="safe-bottom fixed inset-x-0 bottom-0 z-50 flex h-16 items-stretch border-t border-border/50 bg-background/80 backdrop-blur-xl md:hidden"
        data-testid={testIds.mobileNav}
      >
        {mobileNavigation.map(({ icon: Icon, label, to }) => {
          const isActive = navigationItemIsActive(pathname, to);
          const navTestId =
            to === '/'
              ? testIds.mobileNavHome
              : to === '/trips'
                ? testIds.mobileNavTrips
                : to === '/ideas'
                  ? testIds.mobileNavPlan
                  : to === '/chat'
                    ? testIds.mobileNavChat
                    : testIds.navSettings;
          return (
            <Link
              aria-current={isActive ? 'page' : undefined}
              aria-label={label}
              className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium text-muted-foreground transition-colors"
              data-testid={navTestId}
              key={to}
              to={to}
            >
              <Icon
                className={isActive ? 'size-5 text-primary' : 'size-5'}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={isActive ? 'font-semibold text-primary' : undefined}>{label}</span>
              {isActive && (
                <span className="absolute -top-0.5 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
        <button
          aria-label="More"
          className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium text-muted-foreground transition-colors"
          data-testid={testIds.mobileNavMore}
          onClick={toggleSidebar}
          type="button"
        >
          <Menu className="size-5" />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}

function WorkspaceSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="pb-2 group-data-[collapsible=icon]:p-2">
        <OrganizationMenu />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavigationItem {...primaryNavigation[0]} />
              <TripsSidebarNav />
              <ChatsSidebarNav />
              <InboxSidebarNav />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Planning</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <IdeasSidebarNav />
              <IssuesSidebarNav />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Preferences</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {manageNavigation.map((item) => (
                <NavigationItem key={item.to} {...item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/50 p-2">
        <AccountMenu />
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
          className="h-auto px-1 py-1"
          data-group-name={activeOrganization.name}
          data-testid={testIds.groupSwitcher}
          size="lg"
          tooltip={activeOrganization.name}
        >
          <Avatar className="size-8 rounded-lg">
            <AvatarImage alt={activeOrganization.name} src={activeOrganization.logo ?? ''} />
            <AvatarFallback className="rounded-lg bg-primary font-bold text-primary-foreground">
              {activeOrganization.name.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate font-semibold">{activeOrganization.name}</span>
            <span className="truncate text-xs capitalize text-muted-foreground">{activeRole}</span>
          </span>
          <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
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
            {organization.id === activeOrganization.id && <Check className="ml-auto" />}
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
          <LogIn />
          Join with code
        </DropdownMenuItem>
        <DropdownMenuItem
          data-testid={testIds.groupSwitcherNew}
          onClick={() => {
            setOpenMobile(false);
            openDialog('create-organization');
          }}
        >
          <Plus />
          New group
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setOpenMobile(false);
            void navigate({ params: { section: 'group' }, to: '/settings/$section' });
          }}
        >
          <Settings />
          Group settings
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
