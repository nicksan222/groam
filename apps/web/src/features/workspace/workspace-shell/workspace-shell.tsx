import { Menu, Sparkles } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { SidebarProvider } from '@groam/ui/components/sidebar';
import { useSidebar } from '@groam/ui/hooks/use-sidebar';
import { Outlet, useLocation } from '@tanstack/react-router';
import { Link } from '@/features/workspace/navigation/router';
import { CommandPalette } from '@/features/workspace/workspace-command/command-palette';
import {
  isChatThreadRoute,
  mobileNavigation,
  navigationItemIsActive
} from '@/features/workspace/workspace-sidebar/sidebar-nav';
import { testIds } from '@/lib/test-ids';
import type { SidebarNavItem } from '@/types/workspace';
import { ReferenceContent } from './reference-content';
import { ConfirmDialogProvider } from './use-confirm-dialog';
import { WorkspaceAssistantWidget } from './workspace-assistant-widget';
import { WorkspaceDialogs } from './workspace-dialogs';
import { WorkspaceSidebar } from './workspace-sidebar';
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
  if (!isMobile || isChatThreadRoute(pathname)) return null;

  return (
    <>
      <div className="h-16 shrink-0 md:hidden" />
      <nav
        aria-label="Mobile navigation"
        className="safe-bottom fixed inset-x-0 bottom-0 z-50 flex h-16 items-stretch border-t border-border/50 bg-background/80 backdrop-blur-xl md:hidden"
        data-testid={testIds.mobileNav}
      >
        {mobileNavigation.map((item) => (
          <MobileNavigationItem item={item} key={item.to} pathname={pathname} />
        ))}
        <Button
          aria-label="Open Groam AI"
          className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium text-muted-foreground transition-colors"
          onClick={() => window.dispatchEvent(new Event('groam:open-assistant'))}
          type="button"
          unstyled
        >
          <Sparkles className="size-5" />
          <span>AI</span>
        </Button>
        <Button
          aria-label="More"
          className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium text-muted-foreground transition-colors"
          data-testid={testIds.mobileNavMore}
          onClick={toggleSidebar}
          type="button"
          unstyled
        >
          <Menu className="size-5" />
          <span>More</span>
        </Button>
      </nav>
    </>
  );
}

function MobileNavigationItem({ item, pathname }: { item: SidebarNavItem; pathname: string }) {
  const { icon: Icon, label, to } = item;
  const isActive = navigationItemIsActive(pathname, to);
  return (
    <Link
      aria-current={isActive ? 'page' : undefined}
      aria-label={label}
      className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium text-muted-foreground transition-colors"
      data-testid={mobileNavigationTestId(to)}
      to={to}
    >
      <Icon
        className={isActive ? 'size-5 text-primary' : 'size-5'}
        strokeWidth={isActive ? 2.5 : 2}
      />
      <span className={isActive ? 'font-semibold text-primary' : undefined}>{label}</span>
      {isActive ? (
        <span className="absolute -top-0.5 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-primary" />
      ) : null}
    </Link>
  );
}

function mobileNavigationTestId(to: string) {
  return (
    {
      '/': testIds.mobileNavHome,
      '/chat': testIds.mobileNavChat,
      '/ideas': testIds.mobileNavPlan,
      '/trips': testIds.mobileNavTrips
    }[to] ?? testIds.navSettings
  );
}
