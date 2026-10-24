import { SidebarProvider } from '@groam/ui/components/sidebar';
import type { ReactNode } from 'react';
import { CommandPalette } from '@/features/workspace/workspace-command/command-palette';
import { MobileTopBar } from './mobile-top-bar';
import { ReferenceContent } from './reference-content';
import { ConfirmDialogProvider } from './use-confirm-dialog';
import { WorkspaceAssistantWidget } from './workspace-assistant-widget';
import { WorkspaceDialogs } from './workspace-dialogs';
import { WorkspaceSidebar } from './workspace-sidebar';
import { useWorkspace } from './workspace-state';

/** The workspace chrome around the current page. */
export function WorkspaceShell({ children }: { children: ReactNode }) {
  const { activeOrganization } = useWorkspace();
  return (
    <SidebarProvider className="h-svh min-h-0 overflow-hidden">
      <ConfirmDialogProvider>
        <WorkspaceSidebar />
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <MobileTopBar />
          <ReferenceContent>{children}</ReferenceContent>
        </div>
        <WorkspaceAssistantWidget organizationId={activeOrganization.id} />
        <WorkspaceDialogs />
        <CommandPalette />
      </ConfirmDialogProvider>
    </SidebarProvider>
  );
}
